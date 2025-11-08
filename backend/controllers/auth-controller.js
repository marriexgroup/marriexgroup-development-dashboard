import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Verification from "../models/verification.js";
import { sendEmail } from "../libs/send-email.js";
import { authenticator as totp } from "otplib";
import aj from "../libs/arcjet.js";

const registerUser = async (req, res) => {
  try {
    const { email, name, password, dataProtectionAgreementAccepted } = req.body;

    // Get IP address from request
    const ipAddress =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress ||
      "unknown";

    if (!dataProtectionAgreementAccepted) {
      return res.status(400).json({
        message:
          "You must accept the Data Protection and Confidentiality Consent Agreement to continue",
      });
    }

    const decision = await aj.protect(req, { email });
    console.log("Arcjet decision", decision.isDenied());

    if (decision.isDenied()) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Invalid email address" }));
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email address already in use",
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      password: hashPassword,
      name,
      dataProtectionAgreement: {
        accepted: true,
        acceptedAt: new Date(),
        acceptedIpAddress: ipAddress,
      },
    });

    const verificationToken = jwt.sign(
      { userId: newUser._id, purpose: "email-verification" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    await Verification.create({
      userId: newUser._id,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
    });

    // send email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailBody = `<p>Click <a href="${verificationLink}">here</a> to verify your email</p>`;
    const emailSubject = "Verify your email";

    // const isEmailSent = await sendEmail(email, emailSubject, emailBody);

    // if (!isEmailSent) {
    //   return res.status(500).json({
    //     message: "Failed to send verification email",
    //   });
    // }

    res.status(201).json({
      message:
        "Verification email sent to your email. Please check and verify your account.",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isEmailVerified) {
      const existingVerification = await Verification.findOne({
        userId: user._id,
      });

      if (existingVerification && existingVerification.expiresAt > new Date()) {
        return res.status(400).json({
          message:
            "Email not verified. Please check your email for the verification link.",
        });
      } else {
        await Verification.findByIdAndDelete(existingVerification._id);

        const verificationToken = jwt.sign(
          { userId: user._id, purpose: "email-verification" },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        await Verification.create({
          userId: user._id,
          token: verificationToken,
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        });

        // send email
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        const emailBody = `<p>Click <a href="${verificationLink}">here</a> to verify your email</p>`;
        const emailSubject = "Verify your email";

        const isEmailSent = await sendEmail(email, emailSubject, emailBody);

        if (!isEmailSent) {
          return res.status(500).json({
            message: "Failed to send verification email",
          });
        }

        res.status(201).json({
          message:
            "Verification email sent to your email. Please check and verify your account.",
        });
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, purpose: "login" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    user.lastLogin = new Date();
    await user.save();

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId, purpose } = payload;

    if (purpose !== "email-verification") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const verification = await Verification.findOne({
      userId,
      token,
    });

    if (!verification) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isTokenExpired = verification.expiresAt < new Date();

    if (isTokenExpired) {
      return res.status(401).json({ message: "Token expired" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    user.isEmailVerified = true;
    await user.save();

    await Verification.findByIdAndDelete(verification._id);

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const resetPasswordRequest = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select("+twoFASecret");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isEmailVerified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }

    if (!user.is2FAEnabled || !user.twoFASecret) {
      return res.status(400).json({
        message: "Authenticator not enabled for this account",
      });
    }

    const isOtpValid = totp.verify({ token: otp, secret: user.twoFASecret });

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid authenticator code" });
    }

    const existingVerification = await Verification.findOne({
      userId: user._id,
    });

    if (existingVerification && existingVerification.expiresAt > new Date()) {
      return res.status(400).json({
        message: "Reset password request already sent",
      });
    }

    if (existingVerification && existingVerification.expiresAt < new Date()) {
      await Verification.findByIdAndDelete(existingVerification._id);
    }

    const resetPasswordToken = jwt.sign(
      { userId: user._id, purpose: "reset-password" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    await Verification.create({
      userId: user._id,
      token: resetPasswordToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    // Return token directly (no email)
    res.status(200).json({
      message: "Authenticator verified. Proceed to reset password",
      token: resetPasswordToken,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyResetPasswordTokenAndResetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId, purpose } = payload;

    if (purpose !== "reset-password") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const verification = await Verification.findOne({
      userId,
      token,
    });

    if (!verification) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isTokenExpired = verification.expiresAt < new Date();

    if (isTokenExpired) {
      return res.status(401).json({ message: "Token expired" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const salt = await bcrypt.genSalt(10);

    const hashPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashPassword;
    await user.save();

    await Verification.findByIdAndDelete(verification._id);

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 2FA Setup: Request - generates a secret and returns otpauth URL
const setupTwoFARequest = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.is2FAEnabled && user.twoFASecret) {
      return res.status(400).json({ message: "Authenticator already enabled" });
    }

    const secret = totp.generateSecret();
    user.twoFASecret = secret;
    await user.save();

    const issuer = process.env.APP_NAME || "MarriexGroupDashboard";
    const otpauth = totp.keyuri(email, issuer, secret);

    return res.status(200).json({
      message: "Authenticator setup initiated",
      secret,
      otpauth,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// 2FA Setup: Verify - confirms OTP and enables 2FA
const setupTwoFAVerify = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select("+password +twoFASecret");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.twoFASecret) {
      return res.status(400).json({ message: "No authenticator setup in progress" });
    }

    const isValid = totp.verify({ token: otp, secret: user.twoFASecret });

    if (!isValid) {
      return res.status(400).json({ message: "Invalid authenticator code" });
    }

    user.is2FAEnabled = true;
    await user.save();

    return res.status(200).json({ message: "Authenticator enabled successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Sign Agreement with 2FA verification
const signAgreement = async (req, res) => {
  try {
    const { email, otp, fullName, designation } = req.body;

    const user = await User.findOne({ email }).select("+twoFASecret");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.is2FAEnabled || !user.twoFASecret) {
      return res.status(400).json({ message: "2FA is not enabled for this account" });
    }

    // Verify 2FA code
    const isValid = totp.verify({ token: otp, secret: user.twoFASecret });

    if (!isValid) {
      return res.status(400).json({ message: "Invalid authenticator code" });
    }

    // Get IP address
    const ipAddress =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress ||
      "unknown";

    // Update agreement signed data
    user.dataProtectionAgreement.accepted = true;
    user.dataProtectionAgreement.acceptedAt = new Date();
    user.dataProtectionAgreement.acceptedIpAddress = ipAddress;
    user.dataProtectionAgreement.signed = {
      fullName,
      designation,
      date: new Date(),
      signedAt: new Date(),
      signedWith2FA: true,
    };

    await user.save();

    return res.status(200).json({
      message: "Agreement signed successfully",
      signed: user.dataProtectionAgreement.signed,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export {
  registerUser,
  loginUser,
  verifyEmail,
  resetPasswordRequest,
  verifyResetPasswordTokenAndResetPassword,
  setupTwoFARequest,
  setupTwoFAVerify,
  signAgreement,
};
