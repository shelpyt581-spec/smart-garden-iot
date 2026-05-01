const Ticket = require('../models/Ticket');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const twilio = require('twilio');

// Initialize Twilio client
const twilioClient = new twilio(
    process.env.TWILIO_ACCOUNT_SID || 'AC6c8054042a2affa8be6b8d169d7c3101',
    process.env.TWILIO_AUTH_TOKEN || 'OR10c73c920c1c778a5ff7addb2351b05e'
);

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes
const IV_LENGTH = 16;

const encryptCard = (text) => {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const checkout = async (req, res) => {
    try {
        if (!req.body.quantities || !req.body.subscriptionPlan) {
            return res.status(400).json({ error: 'Missing quantities or subscription plan' });
        }

        const { quantities, selectedDate, subscriptionPlan } = req.body;
        const newTickets = [];

        // Define the individual prices
        const prices = { child: 100, adult: 200, senior: 150 };

        // Loop through the quantities object
        for (const [type, count] of Object.entries(quantities)) {
            if (count > 0) {
                // For every single ticket of this type, push a new document
                for (let i = 0; i < count; i++) {
                    let validFrom = new Date();
                    let validUntil = new Date();

                    // Date logic
                    if (subscriptionPlan === 'monthly') {
                        validUntil.setDate(validUntil.getDate() + 30);
                    } else {
                        validFrom = new Date(selectedDate);
                        validFrom.setHours(0, 0, 0, 0);
                        validUntil = new Date(selectedDate);
                        validUntil.setHours(23, 59, 59, 999);
                    }

                    newTickets.push({
                        userId: req.user._id,
                        ticketType: type, // strictly 'adult', 'child', etc.
                        price: prices[type],
                        subscriptionPlan: subscriptionPlan,
                        validFrom: validFrom,
                        validUntil: validUntil,
                        status: 'active'
                    });
                }
            }
        }

        // Bulk insert the separate tickets into MongoDB
        const savedTickets = await Ticket.insertMany(newTickets);

        // --- TWILIO WHATSAPP NOTIFICATION ---
        try {
            console.log('--- WhatsApp Debug ---');
            console.log('Saved Tickets Count:', savedTickets.length);

            if (req.user.phone) {
                // Clean the phone number (remove spaces, dashes, etc.)
                let cleanPhone = req.user.phone.replace(/[\s\-\(\)]/g, '');
                // Ensure it starts with +
                const phone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

                console.log(`Formatted Phone: ${phone}`);

                const ticketSummary = savedTickets.map(t => `- ${t.ticketType.toUpperCase()} Pass (ID: ${t._id.toString().slice(-6)})`).join('\n');
                const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

                console.log(`Sending from: whatsapp:${fromNumber}`);

                const message = await twilioClient.messages.create({
                    from: `whatsapp:${fromNumber}`,
                    to: `whatsapp:${phone}`,
                    body: `🎟️ *Smart Park Ticket Confirmation* \n\nThank you for your purchase, ${req.user.name}! \n\n*Your Tickets:*\n${ticketSummary}\n\n*Validity:* \n${subscriptionPlan === 'monthly' ? 'Valid for 30 days from today' : `Valid strictly on ${new Date(selectedDate).toLocaleDateString()}`}\n\nShow these IDs at the gate or view your QR codes in your Profile. Enjoy your visit! 🌿`
                });

                console.log(`WhatsApp Success! Message SID: ${message.sid}`);
            } else {
                console.warn('WhatsApp Skipped: No phone number found for user.');
            }
        } catch (twError) {
            console.error('--- WhatsApp Failure ---');
            console.error('Twilio Error Code:', twError.code);
            console.error('Twilio Error Message:', twError.message);
        }

        return res.status(200).json({ message: 'Checkout successful', tickets: savedTickets });

    } catch (error) {
        console.error('Checkout Error:', error);
        return res.status(500).json({ message: 'Server error during checkout' });
    }
};

const getTicketHistory = async (req, res) => {
    try {
        const tickets = await Ticket.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { checkout, getTicketHistory };
