import User from "../models/user.js";

export const getAllUsers = async (req, res) => {
    try {
        const user = req.user;

        if (!user || !user.isSuperAdmin) {
            return res.status(403).json({
                message: "Forbidden: Super Admin access required",
            });
        }

        const users = await User.find({}).sort({ createdAt: -1 }).select("-password");

        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
};
