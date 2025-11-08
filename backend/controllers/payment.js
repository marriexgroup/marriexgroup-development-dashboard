import Payment from "../models/payment.js";
import Workspace from "../models/workspace.js";
import Project from "../models/project.js";
import Task from "../models/task.js";

const createPayment = async (req, res) => {
  try {
    const {
      amount,
      currency,
      description,
      paymentDate,
      status,
      projects,
      tasks,
      workspace,
      notes,
      invoiceNumber,
    } = req.body;

    // Validate workspace exists and user is owner
    const workspaceDoc = await Workspace.findById(workspace);
    if (!workspaceDoc) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    // Check if user is workspace owner
    const isOwner =
      workspaceDoc.owner.toString() === req.user._id.toString() ||
      workspaceDoc.members.some(
        (member) =>
          member.user.toString() === req.user._id.toString() &&
          member.role === "owner"
      );

    if (!isOwner) {
      return res.status(403).json({
        message: "Only workspace owners can create payments",
      });
    }

    // Validate projects exist and belong to workspace
    if (projects && projects.length > 0) {
      const projectsDoc = await Project.find({
        _id: { $in: projects },
        workspace: workspace,
      });

      if (projectsDoc.length !== projects.length) {
        return res.status(400).json({
          message: "One or more projects not found or don't belong to this workspace",
        });
      }
    }

    // Validate tasks exist and belong to selected projects
    if (tasks && tasks.length > 0) {
      const tasksDoc = await Task.find({
        _id: { $in: tasks },
        project: { $in: projects || [] },
      });

      if (tasksDoc.length !== tasks.length) {
        return res.status(400).json({
          message: "One or more tasks not found or don't belong to selected projects",
        });
      }
    }

    const payment = await Payment.create({
      amount,
      currency: currency || "USD",
      description,
      paymentDate: paymentDate || new Date(),
      status: status || "pending",
      projects: projects || [],
      tasks: tasks || [],
      workspace,
      notes,
      invoiceNumber,
      createdBy: req.user._id,
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate("projects", "title workspace")
      .populate("tasks", "title project")
      .populate("workspace", "name color")
      .populate("createdBy", "name email");

    res.status(201).json(populatedPayment);
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Invoice number already exists",
      });
    }
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getPayments = async (req, res) => {
  try {
    const { workspaceId } = req.query;

    let query = {};

    // If workspaceId is provided, filter by workspace
    if (workspaceId) {
      // Check if user is member of workspace
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          message: "Workspace not found",
        });
      }

      const isMember =
        workspace.owner.toString() === req.user._id.toString() ||
        workspace.members.some(
          (member) => member.user.toString() === req.user._id.toString()
        );

      if (!isMember) {
        return res.status(403).json({
          message: "You are not a member of this workspace",
        });
      }

      query.workspace = workspaceId;
    } else {
      // Get all workspaces user is member of
      const workspaces = await Workspace.find({
        $or: [
          { owner: req.user._id },
          { "members.user": req.user._id },
        ],
      });

      const workspaceIds = workspaces.map((ws) => ws._id);
      query.workspace = { $in: workspaceIds };
    }

    const payments = await Payment.find(query)
      .populate("projects", "title workspace")
      .populate("tasks", "title project")
      .populate("workspace", "name color")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate("projects", "title workspace")
      .populate("tasks", "title project")
      .populate("workspace", "name color")
      .populate("createdBy", "name email");

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    // Check if user has access to this payment's workspace
    const workspace = await Workspace.findById(payment.workspace);
    const isMember =
      workspace.owner.toString() === req.user._id.toString() ||
      workspace.members.some(
        (member) => member.user.toString() === req.user._id.toString()
      );

    if (!isMember) {
      return res.status(403).json({
        message: "You don't have access to this payment",
      });
    }

    res.status(200).json(payment);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updatePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const {
      amount,
      currency,
      description,
      paymentDate,
      status,
      projects,
      tasks,
      notes,
      invoiceNumber,
    } = req.body;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    // Check if user is workspace owner
    const workspace = await Workspace.findById(payment.workspace);
    const isOwner =
      workspace.owner.toString() === req.user._id.toString() ||
      workspace.members.some(
        (member) =>
          member.user.toString() === req.user._id.toString() &&
          member.role === "owner"
      );

    if (!isOwner) {
      return res.status(403).json({
        message: "Only workspace owners can update payments",
      });
    }

    // Validate projects if provided
    if (projects && projects.length > 0) {
      const projectsDoc = await Project.find({
        _id: { $in: projects },
        workspace: payment.workspace,
      });

      if (projectsDoc.length !== projects.length) {
        return res.status(400).json({
          message: "One or more projects not found or don't belong to this workspace",
        });
      }
    }

    // Validate tasks if provided
    if (tasks && tasks.length > 0) {
      const tasksDoc = await Task.find({
        _id: { $in: tasks },
        project: { $in: projects || payment.projects },
      });

      if (tasksDoc.length !== tasks.length) {
        return res.status(400).json({
          message: "One or more tasks not found or don't belong to selected projects",
        });
      }
    }

    // Update payment
    if (amount !== undefined) payment.amount = amount;
    if (currency !== undefined) payment.currency = currency;
    if (description !== undefined) payment.description = description;
    if (paymentDate !== undefined) payment.paymentDate = paymentDate;
    if (status !== undefined) payment.status = status;
    if (projects !== undefined) payment.projects = projects;
    if (tasks !== undefined) payment.tasks = tasks;
    if (notes !== undefined) payment.notes = notes;
    if (invoiceNumber !== undefined) payment.invoiceNumber = invoiceNumber;

    await payment.save();

    const updatedPayment = await Payment.findById(paymentId)
      .populate("projects", "title workspace")
      .populate("tasks", "title project")
      .populate("workspace", "name color")
      .populate("createdBy", "name email");

    res.status(200).json(updatedPayment);
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Invoice number already exists",
      });
    }
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    // Check if user is workspace owner
    const workspace = await Workspace.findById(payment.workspace);
    const isOwner =
      workspace.owner.toString() === req.user._id.toString() ||
      workspace.members.some(
        (member) =>
          member.user.toString() === req.user._id.toString() &&
          member.role === "owner"
      );

    if (!isOwner) {
      return res.status(403).json({
        message: "Only workspace owners can delete payments",
      });
    }

    await Payment.findByIdAndDelete(paymentId);

    res.status(200).json({
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
};

