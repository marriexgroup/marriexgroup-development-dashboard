import WorkSession from "../models/work-session.js";

export const getWorkHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        const sessions = await WorkSession.find({ user: userId })
            .sort({ startTime: -1 })
            .populate("user", "name email");

        res.status(200).json(sessions);
    } catch (error) {
        console.error("Error fetching work history:", error);
        res.status(500).json({ message: "Failed to fetch work history" });
    }
};

export const getAllWorkSessions = async (req, res) => {
    try {
        const sessions = await WorkSession.find()
            .sort({ startTime: -1 })
            .populate("user", "name email");

        res.status(200).json(sessions);
    } catch (error) {
        console.error("Error fetching all work sessions:", error);
        res.status(500).json({ message: "Failed to fetch work sessions" });
    }
};
