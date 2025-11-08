import { signUpSchema } from "@/lib/schema";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router";
import {
  useSignUpMutation,
  useSetup2FARequestMutation,
  useSetup2FAVerifyMutation,
  useSignAgreementMutation,
} from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import * as QRCode from "qrcode";
import { ScrollArea } from "@/components/ui/scroll-area";

export type SignupFormData = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [hasReadAgreement, setHasReadAgreement] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(false);
  const [isUserCreated, setIsUserCreated] = useState(false);
  const agreementContentRef = React.useRef<HTMLDivElement>(null);
  const [setupData, setSetupData] = useState<
    | null
    | {
        secret: string;
        otpauth: string;
      }
  >(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const form = useForm<SignupFormData & { otp?: string; fullName?: string; designation?: string; signOtp?: string }>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      confirmPassword: "",
      dataProtectionAgreementAccepted: false,
      otp: "",
      fullName: "",
      designation: "",
      signOtp: "",
    },
  });

  const { mutate, isPending } = useSignUpMutation();
  const { mutate: setupRequest, isPending: isSetupReqPending } =
    useSetup2FARequestMutation();
  const { mutate: setupVerify, isPending: isSetupVerifyPending } =
    useSetup2FAVerifyMutation();
  const { mutate: signAgreement, isPending: isSigningAgreement } =
    useSignAgreementMutation();

  // Generate QR code when setupData changes
  useEffect(() => {
    let mounted = true;
    if (setupData?.otpauth) {
      QRCode.toDataURL(setupData.otpauth, { margin: 1, width: 192 })
        .then((url: string) => {
          if (mounted) setQrDataUrl(url);
        })
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
    return () => {
      mounted = false;
    };
  }, [setupData?.otpauth]);

  // Step 1: Create user account (basic info only)
  const handleStep1Next = () => {
    const email = form.getValues("email");
    const name = form.getValues("name");
    const password = form.getValues("password");
    const confirmPassword = form.getValues("confirmPassword");

    // Basic validation
    if (!email || !name || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Create user account (with temporary agreement acceptance for backend requirement)
    // User will properly read and accept in Step 3
    const signupData: SignupFormData = {
      email,
      name,
      password,
      confirmPassword,
      dataProtectionAgreementAccepted: true, // Required by backend, but user will read in Step 3
    };

    mutate(signupData, {
      onSuccess: () => {
        setIsUserCreated(true);
        // Reset agreement checkbox so user must accept it in Step 3
        form.setValue("dataProtectionAgreementAccepted", false);
        // Auto-populate full name from registered user
        form.setValue("fullName", name);
        setHasReadAgreement(false);
        toast.success("Account created successfully!");
        // Now trigger 2FA setup request
        setupRequest(
          { email },
          {
            onSuccess: (res: any) => {
              const payload = res?.data || res;
              setSetupData({ secret: payload.secret, otpauth: payload.otpauth });
              setCurrentStep(2);
            },
            onError: (e: any) => {
              toast.error(
                e?.response?.data?.message || "Failed to start 2FA setup"
              );
            },
          }
        );
      },
      onError: (error: any) => {
        const errorMessage =
          error.response?.data?.message || "An error occurred";
        console.log(error);
        toast.error(errorMessage);
      },
    });
  };

  // Step 2: Verify 2FA only
  const handleStep2Next = () => {
    const otp = form.getValues("otp") as string | undefined;
    const email = form.getValues("email");

    if (!otp || otp.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setupVerify(
      { email, otp },
      {
        onSuccess: () => {
          toast.success("Authenticator verified successfully!");
          setIs2FAVerified(true);
          setSetupData(null);
          setCurrentStep(3);
        },
        onError: (e: any) => {
          toast.error(e?.response?.data?.message || "Invalid code");
        },
      }
    );
  };

  // Step 3: Agreement acceptance and final confirmation with 2FA
  const handleStep3Complete = () => {
    const agreementAccepted = form.getValues("dataProtectionAgreementAccepted");
    const fullName = form.getValues("fullName");
    const designation = form.getValues("designation");
    const signOtp = form.getValues("signOtp");
    const email = form.getValues("email");

    if (!is2FAVerified) {
      toast.error("Please complete 2FA verification first");
      return;
    }

    if (!isUserCreated) {
      toast.error("Account creation failed. Please try again.");
      return;
    }

    if (!agreementAccepted) {
      toast.error("Please accept the Data Protection Agreement first");
      form.setError("dataProtectionAgreementAccepted", {
        type: "manual",
        message: "You must accept the agreement to continue",
      });
      return;
    }

    if (!hasReadAgreement) {
      toast.error("Please read the agreement first", {
        description:
          "You must scroll through and read the complete Data Protection and Confidentiality Consent Agreement before accepting it.",
      });
      form.setError("dataProtectionAgreementAccepted", {
        type: "manual",
        message: "Please read the agreement first",
      });
      return;
    }

    if (!fullName || !designation) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!signOtp || signOtp.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit authenticator code to sign the agreement");
      return;
    }

    // Sign agreement with 2FA
    signAgreement(
      { email, otp: signOtp, fullName, designation },
      {
        onSuccess: () => {
          toast.success("Sign up completed successfully!", {
            description:
              "Please check your email for a verification link. If you don't see it, please check your spam folder.",
          });

          form.reset();
          navigate("/sign-in");
        },
        onError: (error: any) => {
          const errorMessage =
            error.response?.data?.message || "Failed to sign agreement";
          toast.error(errorMessage);
        },
      }
    );
  };

  // Track scroll for agreement reading
  useEffect(() => {
    if (currentStep !== 3 || !agreementContentRef.current) return;

    const timeoutId = setTimeout(() => {
      const scrollArea = agreementContentRef.current?.closest('[data-slot="scroll-area"]');
      const scrollElement = scrollArea?.querySelector('[data-slot="scroll-area-viewport"]') ||
                           scrollArea?.querySelector('[data-radix-scroll-area-viewport]') ||
                           agreementContentRef.current?.parentElement;

      if (!scrollElement) return;

      const handleScroll = () => {
        if (hasReadAgreement) return;

        const scrollTop = scrollElement.scrollTop;
        const scrollHeight = scrollElement.scrollHeight;
        const clientHeight = scrollElement.clientHeight;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        const threshold = 200;
        const contentFits = scrollHeight <= clientHeight + 10;
        const isNearBottom = distanceFromBottom <= threshold || contentFits;

        if (isNearBottom) {
          setHasReadAgreement(true);
        }
      };

      scrollElement.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll(); // Check immediately

      const intervalId = setInterval(handleScroll, 250);

      return () => {
        clearInterval(intervalId);
        scrollElement.removeEventListener("scroll", handleScroll);
      };
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentStep, hasReadAgreement]);

  const progressValue = (currentStep / 3) * 100;

  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <Card className={`${currentStep === 3 ? "max-w-4xl" : "max-w-md"} w-full shadow-xl`}>
        <CardHeader className="text-center mb-5">
          <CardTitle className="text-2xl font-bold">
            Create an account
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Step {currentStep} of 3
          </CardDescription>
          <div className="mt-4">
            <Progress value={progressValue} className="h-2" />
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Basic Information
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your account details
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="********"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="********"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  className="w-full"
                  onClick={handleStep1Next}
                  disabled={isPending || isSetupReqPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : isSetupReqPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up 2FA...
                    </>
                  ) : (
                    <>
                      Create Account & Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 2: 2-Step Verification */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Setup 2-Step Verification
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Scan the QR code with your authenticator app
                  </p>
                </div>

                {setupData ? (
                  <div className="space-y-4 border rounded-md p-4">
                    <div className="text-sm">
                      <p className="font-semibold">Setup Authenticator</p>
                      <p className="text-muted-foreground">
                        Add a new account in your authenticator app using the QR
                        code or secret below.
                      </p>
                    </div>
                    {qrDataUrl && (
                      <div className="flex items-center justify-center py-2">
                        <img
                          src={qrDataUrl}
                          alt="Authenticator QR"
                          className="h-48 w-48"
                        />
                      </div>
                    )}
                    <div className="text-xs break-all space-y-1">
                      <div>
                        <span className="font-semibold">Secret: </span>
                        <span className="font-mono">{setupData.secret}</span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Enter 6-digit code from your app</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="000000"
                              maxLength={6}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Setting up 2FA...
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={isSetupVerifyPending}
                    onClick={handleStep2Next}
                  >
                    {isSetupVerifyPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Data Protection Agreement */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Data Protection Agreement
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Please read and accept the agreement to complete signup
                  </p>
                </div>

                <div className="space-y-3">
                  {isUserCreated && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-200">
                        Account created successfully
                      </span>
                    </div>
                  )}

                  {is2FAVerified && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-200">
                        2-Step Verification completed
                      </span>
                    </div>
                  )}

                  {!hasReadAgreement && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-md">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Please scroll to the bottom to read the complete agreement
                      </p>
                    </div>
                  )}

                  {hasReadAgreement && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-200">
                        ✓ Agreement read completely
                      </span>
                    </div>
                  )}
                </div>

                <ScrollArea className="h-[400px] border rounded-md p-4">
                  <div ref={agreementContentRef} className="space-y-4 text-sm leading-relaxed pr-4">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold mb-2">
                        DATA PROTECTION AND CONFIDENTIALITY CONSENT AGREEMENT
                      </h2>
                      <p className="text-muted-foreground">of MARRIED (PRIVATE) LIMITED</p>
                      <p className="text-muted-foreground">
                        Company Registration Number: P V 00216115
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground italic">
                      (Hereinafter referred to as 'the Company')
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Including and applying to all subsidiaries and affiliated brands:
                      Bloonsoo.com (Hotel Booking System), Abboode.com (Payment Gateway),
                      Aipicedit.com (Photo Editor System), Travelonehub.com,
                      Investingoo.com, Dolceimperiale.com, Marriex (Business Portfolio),
                      and all official Facebook pages and digital assets owned or
                      operated under the Company's authority.
                    </p>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">1. PREAMBLE</h3>
                      <p>
                        This Data Protection and Confidentiality Consent Agreement
                        ('Agreement') is made and entered into by and between Married
                        (PVT) Ltd, a company duly incorporated under the laws of Sri
                        Lanka under company registration number P V 00216115 ('the
                        Company'), and each of its employees, contractors, business
                        partners, participants, vendors, service providers, subsidiaries,
                        and associated entities ('the Parties'). The Agreement is
                        executed in accordance with the laws of Sri Lanka, including the
                        Intellectual Property Act No. 36 of 2003, to protect all forms
                        of information, data, intellectual property, business processes,
                        systems, technologies, and client information belonging to or
                        managed by the Company and its subsidiaries.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">2. DEFINITIONS</h3>
                      <p>
                        <strong>Confidential Information</strong> means all non-public
                        information, whether written, electronic, oral, or otherwise,
                        pertaining to the Company. <strong>Data</strong> includes all
                        digital or physical information maintained by or on behalf of the
                        Company. <strong>Intellectual Property</strong> refers to all
                        works, inventions, designs, and trade secrets owned or managed by
                        the Company under the Intellectual Property Act No. 36 of 2003.
                        <strong> Employee or Contractor</strong> includes any person
                        working under employment or contract. <strong>Third Party</strong>{" "}
                        refers to any external organisation engaged in business with the
                        Company.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">3. PURPOSE AND SCOPE</h3>
                      <p>
                        This Agreement establishes the obligations of all Parties to
                        maintain confidentiality and protect data and proprietary
                        information. It applies to all employees, contractors, and
                        partners engaged in any capacity with the Company, whether
                        on-site, remotely, or digitally.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        4. CONSENT AND ACKNOWLEDGEMENT
                      </h3>
                      <p>
                        By signing this Agreement, the Party consents to be bound by its
                        terms, agrees not to disclose any Company data, and acknowledges
                        the Company's right to monitor systems to ensure compliance.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        5. CONFIDENTIALITY OBLIGATIONS
                      </h3>
                      <p>
                        All Parties shall treat Company data as confidential, not
                        disclosing any information during or after engagement. Breach may
                        result in disciplinary action or legal proceedings.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        6. DATA PROTECTION AND STORAGE
                      </h3>
                      <p>
                        All Company data must be stored and transmitted securely. Parties
                        are prohibited from transferring data to unauthorised systems and
                        must use approved security measures.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        7. INTELLECTUAL PROPERTY RIGHTS
                      </h3>
                      <p>
                        All intellectual property created under the Company's employment
                        or contract is owned solely by the Company, including works
                        related to Bloonsoo.com, Abboode.com, Aipicedit.com,
                        Travelonehub.com, Investingoo.com, Dolceimperiale.com, Marriex,
                        and all Facebook pages.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        8. NON-DISCLOSURE OF COMPANY DATA
                      </h3>
                      <p>
                        No Party shall share or publish any Company data or business
                        strategy externally. Breach constitutes grounds for termination
                        and legal action.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        9. THIRD-PARTY AND PARTNER OBLIGATIONS
                      </h3>
                      <p>
                        All partners must execute this Agreement or similar undertakings.
                        Each Party is responsible for ensuring compliance among its
                        personnel and agents.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        10. DATA BREACH AND ENFORCEMENT
                      </h3>
                      <p>
                        The Company may pursue civil and criminal action in Sri Lanka and
                        internationally for data breaches, seeking damages and legal
                        remedies.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        11. RETURN AND DESTRUCTION OF INFORMATION
                      </h3>
                      <p>
                        Upon termination, the Party must return or destroy all Company
                        materials and confirm deletion of data in their possession.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        12. DURATION AND SURVIVAL
                      </h3>
                      <p>
                        This Agreement remains effective throughout engagement and
                        continues indefinitely concerning confidentiality and IP
                        obligations.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        13. GOVERNING LAW AND JURISDICTION
                      </h3>
                      <p>
                        This Agreement is governed by the laws of Sri Lanka. Disputes
                        shall fall under the exclusive jurisdiction of Sri Lankan courts.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        14. COMPANY RIGHTS AND REMEDIES
                      </h3>
                      <p>
                        The Company may suspend access, terminate contracts, or initiate
                        legal action upon breach. Rights are cumulative and non-exclusive.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">15. SEVERABILITY</h3>
                      <p>
                        If any provision is invalid, others remain effective. The
                        Agreement's intent shall not be affected by partial invalidity.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        16. ENTIRE AGREEMENT
                      </h3>
                      <p>
                        This Agreement constitutes the entire understanding between
                        Parties and supersedes previous communications. Modifications must
                        be in writing.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mt-6 mb-2">
                        17. CONSENT DECLARATION
                      </h3>
                      <p>
                        By signing below, each Party acknowledges understanding and
                        acceptance of all terms herein, aware of legal consequences of
                        breach.
                      </p>
                    </section>

                    <div className="mt-8 space-y-6 border-t pt-6">
                      <p className="text-center font-semibold">
                        Executed and Agreed on this {day} day of {month}, {year}
                      </p>

                      <div className="border-t pt-4 pb-2">
                        <p className="font-semibold mb-2">
                          Employee / Contractor / Partner Declaration:
                        </p>
                        <p className="text-sm mb-4">
                          I, the undersigned, confirm I have read and understood the
                          terms of this Agreement and agree to be bound by them.
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="space-y-4 border rounded-md p-4">
                  <h4 className="font-semibold">Sign Agreement</h4>
                  <p className="text-sm text-muted-foreground">
                    Please fill in your details and verify with your authenticator code
                  </p>

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your full name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation / Company</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your designation or company"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="signOtp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authenticator Code (to sign agreement)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="000000"
                            maxLength={6}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter a fresh 6-digit code from your authenticator app to sign the agreement
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dataProtectionAgreementAccepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (!checked) {
                              setHasReadAgreement(false);
                            }
                          }}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none flex-1">
                        <FormLabel className="text-sm font-normal cursor-pointer text-left">
                          I accept the Data Protection and Confidentiality Consent Agreement
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCurrentStep(2)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleStep3Complete}
                    disabled={isSigningAgreement}
                  >
                    {isSigningAgreement ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing...
                      </>
                    ) : (
                      "Complete Sign Up"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Form>

          <CardFooter className="flex items-center justify-center mt-6">
            <div className="flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Already have an account? <Link to="/sign-in">Sign in</Link>
              </p>
            </div>
          </CardFooter>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;
