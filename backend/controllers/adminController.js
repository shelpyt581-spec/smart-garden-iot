const Ticket = require('../models/Ticket');
const User = require('../models/User');
const mongoose = require('mongoose');

const getAdminStats = async (req, res) => {
    try {
        // 1. Total Tickets Sold
        const allTickets = await Ticket.find({});
        let totalTicketsSold = 0;
        allTickets.forEach(t => {
            totalTicketsSold += (t.tickets?.child || 0) + (t.tickets?.adult || 0) + (t.tickets?.senior || 0);
        });

        // Fallback for single-ticket schemas
        if (totalTicketsSold === 0) {
            totalTicketsSold = await Ticket.countDocuments();
        }

        // 2. Most Sold Ticket Aggregation
        const mostSoldAgg = await Ticket.aggregate([
            {
                $group: {
                    _id: "$subscriptionType",
                    totalChild: { $sum: "$tickets.child" },
                    totalAdult: { $sum: "$tickets.adult" },
                    totalSenior: { $sum: "$tickets.senior" },
                    countFallback: { $sum: 1 }
                }
            }
        ]);

        let mostSoldTicket = 'N/A';
        let maxCount = 0;

        mostSoldAgg.forEach(group => {
            if (group.totalChild > maxCount) { maxCount = group.totalChild; mostSoldTicket = `Child (${group._id})`; }
            if (group.totalAdult > maxCount) { maxCount = group.totalAdult; mostSoldTicket = `Adult (${group._id})`; }
            if (group.totalSenior > maxCount) { maxCount = group.totalSenior; mostSoldTicket = `Senior (${group._id})`; }

            if (maxCount === 0 && group.countFallback > maxCount) {
                maxCount = group.countFallback;
                mostSoldTicket = group._id || 'Unknown';
            }
        });

        if (maxCount === 0) mostSoldTicket = 'None yet';

        // 3. Active Users
        const activeUsers = await User.countDocuments({ role: 'user' });

        // 4. Purchasing Users
        const purchasingUsersArray = await Ticket.distinct('userId');
        const purchasingUsers = purchasingUsersArray.length;

        // 5. Current Occupancy
        const currentOccupancy = await Ticket.countDocuments({ status: 'used' });
        const maxCapacity = 1000;
        const capacityPercentage = Math.round((currentOccupancy / maxCapacity) * 100);

        res.status(200).json({
            totalTicketsSold,
            mostSoldTicket,
            activeUsers,
            purchasingUsers,
            currentOccupancy: currentOccupancy,
            capacityPercentage: capacityPercentage
        });

    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ message: 'Server error retrieving stats' });
    }
};

const scanTicket = async (req, res) => {
    try {
        console.log('Attempting to scan ID:', req.body.ticketId);
        const { ticketId } = req.body;

        if (!ticketId) {
            return res.status(400).json({ message: 'ticketId is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({ message: 'Invalid Ticket ID format' });
        }

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const now = new Date();
        if (ticket.validFrom && now < ticket.validFrom) {
            return res.status(400).json({ message: `Ticket is not valid yet. Valid starting: ${new Date(ticket.validFrom).toLocaleDateString()}` });
        }
        if (ticket.validUntil && now > ticket.validUntil) {
            if (ticket.status !== 'expired') {
                ticket.status = 'expired';
                await ticket.save();
            }
            return res.status(400).json({ message: `Ticket has expired on ${new Date(ticket.validUntil).toLocaleDateString()}` });
        }

        if (ticket.status === 'expired') {
            return res.status(400).json({ message: 'Ticket is expired' });
        }

        const subType = ticket.subscriptionType || ticket.subscriptionPlan || 'one-time';

        if (subType === 'monthly') {
            if (ticket.status !== 'active') {
                return res.status(400).json({ message: 'Monthly ticket is not active or has been revoked.' });
            }
            
            if (!ticket.scanHistory) {
                ticket.scanHistory = [];
            }
            ticket.scanHistory.push(new Date());
            await ticket.save();
            
            return res.status(200).json({ message: 'Monthly Pass Validated' });
        } else {
            // Default to 'one-time' behavior
            if (ticket.status === 'used') {
                return res.status(400).json({ message: 'Ticket already scanned and used.' });
            }
            
            if (ticket.status === 'active') {
                ticket.status = 'used';
                if (!ticket.scanHistory) {
                    ticket.scanHistory = [];
                }
                ticket.scanHistory.push(new Date());
                await ticket.save();
                
                return res.status(200).json({ message: 'Ticket scanned successfully. Access granted.' });
            }
            
            return res.status(400).json({ message: 'Invalid ticket status' });
        }

    } catch (error) {
        console.error('Scan Ticket Error:', error);
        res.status(500).json({ message: 'Server error scanning ticket' });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password -savedCards');
        res.status(200).json(users);
    } catch (error) {
        console.error('Fetch Users Error:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

const toggleBlockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.status(200).json({ message: `User has been ${user.isBlocked ? 'blocked' : 'unblocked'}`, isBlocked: user.isBlocked });
    } catch (error) {
        console.error('Block User Error:', error);
        res.status(500).json({ message: 'Error updating user status' });
    }
};

const resetOccupancy = async (req, res) => {
    try {
        const result = await Ticket.updateMany(
            { status: 'used' },
            { $set: { status: 'expired' } }
        );
        
        res.status(200).json({ 
            message: 'Park occupancy has been reset successfully. All used tickets are now archived/expired.',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Reset Occupancy Error:', error);
        res.status(500).json({ message: 'Server error while resetting occupancy' });
    }
};

module.exports = {
    getAdminStats,
    scanTicket,
    getUsers,
    toggleBlockUser,
    resetOccupancy
};
