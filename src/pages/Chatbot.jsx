import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bot, Send, User, Pill, Calendar, Heart, AlertTriangle, Stethoscope, Sparkles } from 'lucide-react';

// ─── Smart Medical Knowledge Base ──────────────
const KNOWLEDGE = {
    greetings: {
        triggers: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'help'],
        responses: [
            "Hello! 👋 I'm MediBot, your health assistant. How can I help you today?",
            "Hi there! 😊 I can help with medication questions, health tips, appointment info, and more. What do you need?",
            "Welcome! 🏥 I'm here to help with your health queries. Ask me anything about medications, symptoms, or wellness tips.",
        ]
    },
    medication: {
        triggers: ['medicine', 'medication', 'pill', 'drug', 'dose', 'tablet', 'capsule', 'prescription', 'take medicine', 'forgot medicine', 'side effect', 'missed dose'],
        responses: [
            "💊 **Medication Tips:**\n• Always take medicines at the same time daily\n• Never skip doses without consulting your doctor\n• Store medicines in a cool, dry place\n• Check expiry dates regularly\n\nWould you like to know about a specific medication?",
            "💊 If you **missed a dose**, take it as soon as you remember. If it's close to your next dose, skip the missed one. **Never double up!** Contact your doctor if you frequently miss doses.",
            "💊 **Common side effects** to watch for:\n• Nausea or stomach upset\n• Dizziness or drowsiness\n• Allergic reactions (rash, swelling)\n\nAlways report unusual symptoms to your doctor immediately.",
        ]
    },
    symptoms: {
        triggers: ['fever', 'headache', 'pain', 'cough', 'cold', 'tired', 'fatigue', 'nausea', 'dizzy', 'breathing', 'chest', 'stomach', 'symptom', 'sick', 'unwell', 'not feeling well'],
        responses: [
            "🌡️ **If you're experiencing symptoms:**\n• Rest and stay hydrated\n• Monitor your temperature\n• Keep track of when symptoms started\n• Contact your doctor if symptoms persist >48hrs\n\n⚠️ For chest pain or difficulty breathing, **seek emergency care immediately.**",
            "🤒 I'm sorry you're not feeling well! Here are some general tips:\n• Drink plenty of fluids (water, warm soup)\n• Get adequate rest\n• Take OTC pain relievers as directed\n• Use the MediBox app to log your symptoms\n\nWould you like me to help schedule a doctor's appointment?",
        ]
    },
    appointment: {
        triggers: ['appointment', 'schedule', 'book', 'visit', 'checkup', 'check-up', 'doctor visit', 'meet doctor', 'consultation'],
        responses: [
            "📅 **Booking an Appointment:**\nYour doctor can schedule appointments for you through the Appointments section. You can view your upcoming appointments in the patient dashboard.\n\nTypes available:\n• 🩺 Regular Check-up\n• 📋 Follow-up Visit\n• 📹 Video Consultation\n• 🚨 Emergency",
            "📅 To schedule an appointment, please contact your assigned doctor or caretaker through the video call feature. They can book it directly through their dashboard.",
        ]
    },
    emergency: {
        triggers: ['emergency', 'urgent', 'ambulance', '911', 'heart attack', 'stroke', 'bleeding', 'choking', 'unconscious', 'can\'t breathe'],
        responses: [
            "🚨 **EMERGENCY NOTICE:**\n\nIf you're experiencing a medical emergency:\n1. **Call 911** (or your local emergency number) immediately\n2. Do NOT wait for online advice\n3. If someone is unconscious, check breathing and start CPR if trained\n4. Stay on the line with emergency services\n\n⚠️ This chatbot cannot provide emergency medical care. Please seek immediate professional help!",
        ]
    },
    wellness: {
        triggers: ['diet', 'exercise', 'sleep', 'water', 'nutrition', 'health tips', 'healthy', 'wellness', 'lifestyle', 'weight', 'stress', 'mental health', 'anxiety', 'depression'],
        responses: [
            "🥗 **Daily Wellness Tips:**\n• 💧 Drink 8 glasses of water daily\n• 🏃 Exercise 30 min, 5 days a week\n• 😴 Get 7-9 hours of quality sleep\n• 🥦 Eat 5 servings of fruits & vegetables\n• 🧘 Practice 10 min of mindfulness daily\n• 🚭 Avoid smoking and limit alcohol",
            "🧠 **Mental Health Matters:**\n• Talk to someone you trust about your feelings\n• Maintain a regular daily routine\n• Stay physically active\n• Limit screen time before bed\n• Practice deep breathing exercises\n• Don't hesitate to seek professional help\n\n💙 Remember: It's okay to not be okay.",
        ]
    },
    video: {
        triggers: ['video call', 'call doctor', 'talk to doctor', 'video', 'telemedicine', 'teleconsultation', 'virtual visit'],
        responses: [
            "📹 **Video Consultation:**\nYou can start a video call with your doctor from the **Video Call** section in the navigation menu.\n\n• Make sure you have a stable internet connection\n• Find a quiet, well-lit space\n• Have your medication list ready\n• Write down your symptoms beforehand",
        ]
    },
    thanks: {
        triggers: ['thank', 'thanks', 'thank you', 'helpful', 'appreciate'],
        responses: [
            "You're welcome! 😊 Take care of your health. I'm always here if you need help!",
            "Happy to help! 💙 Remember to take your medicines on time. Stay healthy!",
            "Glad I could assist! 🌟 Don't hesitate to reach out anytime you need health guidance.",
        ]
    },
};

function getResponse(input) {
    const lower = input.toLowerCase().trim();

    // Check each category
    for (const [, category] of Object.entries(KNOWLEDGE)) {
        for (const trigger of category.triggers) {
            if (lower.includes(trigger)) {
                return category.responses[Math.floor(Math.random() * category.responses.length)];
            }
        }
    }

    // Default fallback
    const fallbacks = [
        "🤔 I'm not sure about that. Here are things I can help with:\n• 💊 Medication questions\n• 🌡️ Symptom guidance\n• 📅 Appointment info\n• 📹 Video call setup\n• 🥗 Wellness tips\n\nTry asking about any of these topics!",
        "I didn't quite understand that. Could you rephrase? I'm best at answering questions about:\n• Medications and dosages\n• Health symptoms\n• Booking appointments\n• General wellness tips",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ═════════════════════════════════════════════════
// Chatbot Component
// ═════════════════════════════════════════════════
export default function Chatbot() {
    const { currentUser } = useAuth();
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'bot',
            text: `Hello ${currentUser?.name || 'there'}! 👋 I'm **MediBot**, your personal health assistant. How can I help you today?\n\nTry asking about:\n• 💊 Medications\n• 🌡️ Symptoms\n• 📅 Appointments\n• 🥗 Health tips`,
            timestamp: Date.now(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const quickActions = [
        { label: '💊 Medication Help', query: 'How should I take my medicine?' },
        { label: '🌡️ I Feel Sick', query: "I'm not feeling well" },
        { label: '📅 Book Appointment', query: 'How do I book an appointment?' },
        { label: '📹 Video Call', query: 'How do I video call my doctor?' },
        { label: '🥗 Health Tips', query: 'Give me some health tips' },
        { label: '🧠 Mental Health', query: 'I need mental health support' },
    ];

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: input.trim(),
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate typing delay
        setTimeout(() => {
            const response = getResponse(userMsg.text);
            setMessages(prev => [...prev, {
                id: `bot-${Date.now()}`,
                role: 'bot',
                text: response,
                timestamp: Date.now(),
            }]);
            setIsTyping(false);
        }, 800 + Math.random() * 700);
    };

    const handleQuickAction = (query) => {
        setInput(query);
        setTimeout(() => {
            const userMsg = {
                id: `user-${Date.now()}`,
                role: 'user',
                text: query,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, userMsg]);
            setIsTyping(true);
            setTimeout(() => {
                const response = getResponse(query);
                setMessages(prev => [...prev, {
                    id: `bot-${Date.now()}`,
                    role: 'bot',
                    text: response,
                    timestamp: Date.now(),
                }]);
                setIsTyping(false);
                setInput('');
            }, 800 + Math.random() * 700);
        }, 100);
    };

    const formatText = (text) => {
        // Simple markdown-like formatting
        return text.split('\n').map((line, i) => {
            // Escape HTML entities first to prevent XSS from user-supplied input
            const escaped = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            let formatted = escaped
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
            return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} style={{ minHeight: line ? undefined : '8px' }} />;
        });
    };

    return (
        <div className="page" style={{ maxWidth: '800px', margin: '0 auto', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <style>{`
                .typing-indicator span {
                    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
                    background: var(--primary); animation: typing-bounce 1.4s ease-in-out infinite;
                    margin: 0 2px;
                }
                .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
                .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typing-bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-8px); } }
                .msg-bubble { animation: msg-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
                @keyframes msg-in { 0% { transform: translateY(10px) scale(0.95); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
                .quick-btn { transition: all 0.2s ease; }
                .quick-btn:hover { transform: translateY(-2px); background: rgba(0,212,255,0.12) !important; }
            `}</style>

            {/* Header */}
            <div className="glass animate-in" style={{
                padding: '16px 20px', marginBottom: '16px',
                display: 'flex', alignItems: 'center', gap: '12px',
            }}>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Bot size={22} color="#000" />
                </div>
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        MediBot <Sparkles size={14} style={{ color: 'var(--warning)' }} />
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                        Always online
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.04)' }}>
                    AI Health Assistant
                </div>
            </div>

            {/* Messages area */}
            <div className="glass" style={{
                flex: 1, padding: '20px', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '16px',
                marginBottom: '16px',
            }}>
                {messages.map(msg => (
                    <div key={msg.id} className="msg-bubble" style={{
                        display: 'flex', gap: '10px',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: msg.role === 'bot'
                                ? 'linear-gradient(135deg, var(--primary), var(--accent))'
                                : 'rgba(255,255,255,0.08)',
                        }}>
                            {msg.role === 'bot' ? <Bot size={16} color="#000" /> : <User size={16} style={{ color: 'var(--text-secondary)' }} />}
                        </div>
                        <div style={{
                            padding: '12px 16px', borderRadius: '16px',
                            background: msg.role === 'bot' ? 'rgba(255,255,255,0.04)' : 'rgba(0,212,255,0.1)',
                            border: `1px solid ${msg.role === 'bot' ? 'rgba(255,255,255,0.06)' : 'rgba(0,212,255,0.15)'}`,
                            fontSize: '0.88rem', lineHeight: '1.6',
                        }}>
                            {formatText(msg.text)}
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="msg-bubble" style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Bot size={16} color="#000" />
                        </div>
                        <div style={{
                            padding: '14px 20px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div className="typing-indicator"><span /><span /><span /></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 2 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    {quickActions.map((a, i) => (
                        <button key={i} onClick={() => handleQuickAction(a.query)} className="quick-btn" style={{
                            padding: '8px 14px', borderRadius: 'var(--radius-full)',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
                            cursor: 'pointer',
                        }}>
                            {a.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Input area */}
            <div className="glass" style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
            }}>
                <input
                    ref={inputRef}
                    type="text"
                    className="input"
                    placeholder="Type your health question..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px' }}
                />
                <button onClick={handleSend} className="btn btn-primary" disabled={!input.trim() || isTyping}
                    style={{ padding: '12px 20px', borderRadius: 'var(--radius-full)' }}>
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
