const crypto = require('crypto');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const Ticket = require('../models/Ticket');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
const IV_LENGTH = 16;
const DAILY_CAPACITY = 100;
const TWILIO_SANDBOX_WHATSAPP_NUMBER = '+14155238886';

let cachedTwilioClient = null;

const getTwilioClient = () => {
    if (cachedTwilioClient) {
        return cachedTwilioClient;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        return null;
    }

    cachedTwilioClient = twilio(accountSid, authToken);
    return cachedTwilioClient;
};

const getDefaultCountryCode = () => {
    const countryCode = process.env.TWILIO_DEFAULT_COUNTRY_CODE || '20';
    return countryCode.replace(/\D/g, '') || '20';
};

const normalizePhoneNumber = (rawPhone) => {
    if (!rawPhone) {
        return null;
    }

    const defaultCountryCode = getDefaultCountryCode();
    let phone = String(rawPhone)
        .trim()
        .replace(/^whatsapp:/i, '')
        .trim()
        .replace(/[^\d+]/g, '');

    if (phone.startsWith('00')) {
        phone = `+${phone.slice(2)}`;
    }

    if (phone.startsWith('+')) {
        const normalized = defaultCountryCode === '20' && phone.startsWith('+200')
            ? `+20${phone.slice(4)}`
            : phone;

        return /^\+\d{8,15}$/.test(normalized) ? normalized : null;
    }

    const digits = phone.replace(/\D/g, '');
    if (!digits) {
        return null;
    }

    let normalized;
    if (digits.startsWith(defaultCountryCode)) {
        normalized = `+${digits}`;
    } else if (defaultCountryCode === '20' && /^1\d{9}$/.test(digits)) {
        normalized = `+20${digits}`;
    } else if (digits.startsWith('0')) {
        normalized = `+${defaultCountryCode}${digits.slice(1)}`;
    } else {
        normalized = `+${digits}`;
    }

    if (defaultCountryCode === '20' && normalized.startsWith('+200')) {
        normalized = `+20${normalized.slice(4)}`;
    }

    return /^\+\d{8,15}$/.test(normalized) ? normalized : null;
};

const toWhatsAppAddress = (rawPhone) => {
    const normalized = normalizePhoneNumber(rawPhone);
    return normalized ? `whatsapp:${normalized}` : null;
};

const maskAddress = (address) => {
    if (!address) {
        return 'unknown';
    }

    return address.replace(/\d(?=\d{4})/g, '*');
};

const getCurrentWeekWindow = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
};

const isDateInCurrentWeek = (date) => {
    const { weekStart, weekEnd } = getCurrentWeekWindow();
    const checkDate = new Date(date);
    return checkDate >= weekStart && checkDate <= weekEnd;
};

const getCrowdLevel = (count) => {
    const percentage = (count / DAILY_CAPACITY) * 100;
    if (percentage <= 30) return 'quiet';
    if (percentage <= 70) return 'moderate';
    return 'busy';
};

const encryptCard = (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const savePaymentCardIfRequested = async ({ user, cardNumber, expiry, saveCard, useSavedCard, savedCardId }) => {
    if (!user.savedCards) {
        user.savedCards = [];
    }

    if (useSavedCard) {
        const hasSavedCard = user.savedCards.some((card) => card._id.toString() === savedCardId);

        if (!hasSavedCard) {
            return { status: 'failed', message: 'Selected saved card was not found' };
        }

        return { status: 'used_saved_card' };
    }

    if (!saveCard || !cardNumber) {
        return { status: 'not_saved' };
    }

    const sanitizedCardNumber = String(cardNumber).replace(/\D/g, '');
    if (sanitizedCardNumber.length !== 16) {
        return { status: 'failed', message: 'Card number must be 16 digits' };
    }

    const last4Digits = sanitizedCardNumber.slice(-4);
    const alreadySaved = user.savedCards.some((card) => card.last4Digits === last4Digits);
    if (alreadySaved) {
        return { status: 'already_saved', last4Digits };
    }

    user.savedCards.push({
        last4Digits,
        encryptedData: encryptCard(JSON.stringify({
            cardNumber: sanitizedCardNumber,
            expiry
        }))
    });

    await user.save();
    return { status: 'saved', last4Digits };
};

const buildWhatsAppTicketBody = ({ user, tickets, selectedDate, subscriptionPlan }) => {
    const ticketSummary = tickets
        .map((ticket) => `- ${ticket.ticketType.toUpperCase()} pass, ID: ${ticket._id}`)
        .join('\n');

    const validity = subscriptionPlan === 'monthly'
        ? 'Valid for 30 days from today'
        : `Valid only on ${new Date(selectedDate).toLocaleDateString()}`;

    return [
        'Smart Park Ticket Confirmation',
        '',
        `Thank you for your purchase, ${user.name}.`,
        '',
        'Your tickets:',
        ticketSummary,
        '',
        `Validity: ${validity}`,
        '',
        'Show these ticket IDs at the gate, or open your profile in Smart Garden to display the QR codes.'
    ].join('\n');
};

const sendTicketsViaWhatsApp = async ({ user, tickets, selectedDate, subscriptionPlan }) => {
    if (!tickets.length) {
        return { status: 'skipped', reason: 'No tickets were created' };
    }

    if (!user.phone) {
        return { status: 'skipped', reason: 'User has no phone number' };
    }

    const client = getTwilioClient();
    if (!client) {
        return { status: 'skipped', reason: 'Twilio credentials are not configured' };
    }

    const from = toWhatsAppAddress(process.env.TWILIO_WHATSAPP_NUMBER || TWILIO_SANDBOX_WHATSAPP_NUMBER);
    const to = toWhatsAppAddress(user.phone);

    if (!from) {
        return { status: 'skipped', reason: 'Twilio WhatsApp sender number is invalid' };
    }

    if (!to) {
        return { status: 'skipped', reason: 'User phone number is not a valid E.164 number' };
    }

    const messagePayload = {
        from,
        to,
        body: buildWhatsAppTicketBody({ user, tickets, selectedDate, subscriptionPlan })
    };

    if (process.env.TWILIO_STATUS_CALLBACK_URL) {
        messagePayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
    }

    console.log(`Sending WhatsApp ticket message from ${maskAddress(from)} to ${maskAddress(to)}`);
    const message = await client.messages.create(messagePayload);

    return {
        status: 'sent',
        sid: message.sid,
        to: maskAddress(to)
    };
};

const buildEmailTicketHtml = ({ user, tickets, selectedDate, subscriptionPlan }) => {
    const ticketList = tickets
        .map((ticket) => `
            <li>
                <strong>${ticket.ticketType.toUpperCase()} Ticket</strong><br/>
                Ticket ID: ${ticket._id}<br/>
                Price: ${ticket.price} EGP
            </li>
        `)
        .join('');

    const validity = subscriptionPlan === 'monthly'
        ? 'Valid for 30 days from today.'
        : `Valid only on ${new Date(selectedDate).toLocaleDateString()}.`;

    return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Smart Park Ticket Confirmation</h2>
            <p>Hello ${user.name},</p>
            <p>Thank you for booking your ticket.</p>
            <p>Your QR code ticket image is attached to this email.</p>

            <h3>Your Tickets:</h3>
            <ul>
                ${ticketList}
            </ul>

            <p><strong>Validity:</strong> ${validity}</p>
            <p>Please show the attached QR code at the entrance.</p>
        </div>
    `;
};

const sendTicketsViaEmail = async ({ user, tickets, selectedDate, subscriptionPlan }) => {
    if (!tickets.length) {
        return { status: 'skipped', reason: 'No tickets were created' };
    }

    if (!user.email) {
        return { status: 'skipped', reason: 'User has no email address' };
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return { status: 'skipped', reason: 'Email credentials are not configured' };
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const attachments = [];

    for (const ticket of tickets) {
        const qrData = JSON.stringify({
            ticketId: ticket._id.toString(),
            userId: user._id.toString(),
            ticketType: ticket.ticketType,
            subscriptionPlan: ticket.subscriptionPlan,
            validFrom: ticket.validFrom,
            validUntil: ticket.validUntil
        });

        const qrImage = await QRCode.toBuffer(qrData);

        attachments.push({
            filename: `smart-park-ticket-${ticket._id}.png`,
            content: qrImage,
            contentType: 'image/png'
        });
    }

    console.log(`Sending ticket email to ${user.email}`);

    const info = await transporter.sendMail({
        from: `"Smart Park" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Your Smart Park Ticket QR Code',
        html: buildEmailTicketHtml({ user, tickets, selectedDate, subscriptionPlan }),
        attachments
    });

    return {
        status: 'sent',
        messageId: info.messageId,
        to: user.email
    };
};

const checkout = async (req, res) => {
    try {
        if (!req.body.quantities || !req.body.subscriptionPlan) {
            return res.status(400).json({ message: 'Missing quantities or subscription plan' });
        }

        const {
            quantities,
            selectedDate,
            subscriptionPlan,
            cardNumber,
            expiry,
            saveCard,
            useSavedCard,
            savedCardId
        } = req.body;

        if (subscriptionPlan === 'one-time') {
            if (!selectedDate) {
                return res.status(400).json({ message: 'Selected date is required for one-time tickets' });
            }

            if (!isDateInCurrentWeek(selectedDate)) {
                const { weekStart, weekEnd } = getCurrentWeekWindow();
                return res.status(400).json({
                    message: 'Date is outside the current week window',
                    weekStart: weekStart.toISOString(),
                    weekEnd: weekEnd.toISOString()
                });
            }

            const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];
            const dayStart = new Date(selectedDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(selectedDate);
            dayEnd.setHours(23, 59, 59, 999);

            const ticketCountMap = await Ticket.countTicketsByDateRange(dayStart.getTime(), dayEnd.getTime());
            const currentCount = ticketCountMap[selectedDateStr] || 0;

            if (currentCount >= DAILY_CAPACITY) {
                return res.status(400).json({
                    message: 'This date has reached maximum capacity',
                    date: selectedDateStr,
                    currentCount,
                    capacity: DAILY_CAPACITY
                });
            }
        }

        const newTickets = [];
        const prices = { child: 100, adult: 200, senior: 150 };

        for (const [type, rawCount] of Object.entries(quantities)) {
            const count = Number(rawCount);
            if (!prices[type] || count <= 0) {
                continue;
            }

            for (let i = 0; i < count; i += 1) {
                let validFrom = new Date();
                let validUntil = new Date();

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
                    ticketType: type,
                    price: prices[type],
                    subscriptionPlan,
                    validFrom,
                    validUntil,
                    status: 'active'
                });
            }
        }

        if (!newTickets.length) {
            return res.status(400).json({ message: 'Please select at least one ticket to checkout' });
        }

        const cardResult = await savePaymentCardIfRequested({
            user: req.user,
            cardNumber,
            expiry,
            saveCard,
            useSavedCard,
            savedCardId
        });

        if (cardResult.status === 'failed') {
            return res.status(400).json({ message: cardResult.message });
        }

        const savedTickets = await Ticket.insertMany(newTickets);

        let whatsappResult = { status: 'skipped', reason: 'Not attempted' };
        let emailResult = { status: 'skipped', reason: 'Not attempted' };

        try {
            whatsappResult = await sendTicketsViaWhatsApp({
                user: req.user,
                tickets: savedTickets,
                selectedDate,
                subscriptionPlan
            });
            console.log('WhatsApp ticket result:', whatsappResult);
        } catch (twError) {
            whatsappResult = {
                status: 'failed',
                code: twError.code,
                message: twError.message
            };
            console.error('Twilio Error Code:', twError.code);
            console.error('Twilio Error Message:', twError.message);
            console.error('Twilio More Info:', twError.moreInfo);
        }

        try {
            emailResult = await sendTicketsViaEmail({
                user: req.user,
                tickets: savedTickets,
                selectedDate,
                subscriptionPlan
            });
            console.log('Email ticket result:', emailResult);
        } catch (emailError) {
            emailResult = {
                status: 'failed',
                message: emailError.message
            };
            console.error('Email Error Message:', emailError.message);
        }

        return res.status(200).json({
            message: 'Checkout successful. Ticket QR code sent to email.',
            tickets: savedTickets,
            whatsapp: whatsappResult,
            email: emailResult,
            card: cardResult
        });
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

const getTicketInsights = async (req, res) => {
    try {
        const { weekStart, weekEnd } = getCurrentWeekWindow();
        const ticketCountMap = await Ticket.countTicketsByDateRange(weekStart.getTime(), weekEnd.getTime());
        const days = [];

        for (let i = 0; i < 7; i += 1) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            const count = ticketCountMap[dateStr] || 0;

            days.push({
                date: dateStr,
                dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
                displayDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count,
                crowdLevel: getCrowdLevel(count),
                isToday: currentDate.toDateString() === new Date().toDateString()
            });
        }

        res.json({
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
            days,
            capacity: DAILY_CAPACITY
        });
    } catch (error) {
        console.error('Ticket Insights Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { checkout, getTicketHistory, getTicketInsights };            