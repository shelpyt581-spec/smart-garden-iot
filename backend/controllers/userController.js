const User = require('../models/User');

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            hasDisability: user.hasDisability,
            role: user.role,
            savedCards: user.savedCards
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone || user.phone;
            if (req.body.hasDisability !== undefined) {
                user.hasDisability = req.body.hasDisability;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                hasDisability: updatedUser.hasDisability,
                message: 'Profile updated successfully'
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteSavedCard = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.savedCards = user.savedCards.filter(
            (card) => card._id.toString() !== req.params.cardId
        );
        
        await user.save();
        res.json({ message: 'Card removed successfully', savedCards: user.savedCards });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUserProfile, updateUserProfile, deleteSavedCard };
