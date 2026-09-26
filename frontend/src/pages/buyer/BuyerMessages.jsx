import { useEffect, useState, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import styles from './BuyerMessages.module.css';

export default function BuyerMessages() {
    const { user } = useAuth();
    const [threads, setThreads] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [compose, setCompose] = useState({ to: '', subject: '', message: '' });
    const messagesEndRef = useRef(null);

    const fetchThreads = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/api/messages');
            setThreads(res.data);
        } catch (err) {
            console.error('Failed to fetch messages', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    const openThread = async (thread) => {
        setActiveThread(thread);
        try {
            const res = await axiosInstance.get(`/api/messages/thread/${thread.threadId}`);
            setMessages(res.data);
            // Mark as read in threads list
            setThreads(prev => prev.map(t =>
                t.threadId === thread.threadId ? { ...t, read: true } : t
            ));
        } catch (err) {
            console.error('Failed to fetch thread', err);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleReply = async (e) => {
        e.preventDefault();
        if (!reply.trim() || !activeThread) return;
        setSending(true);
        try {
            const receiverEmail = activeThread.senderEmail === user?.email
                ? activeThread.receiverEmail
                : activeThread.senderEmail;

            const res = await axiosInstance.post('/api/messages', {
                receiverEmail,
                subject: activeThread.subject,
                content: reply,
                threadId: activeThread.threadId,
            });
            setMessages(prev => [...prev, res.data]);
            setReply('');
            fetchThreads();
        } catch (err) {
            alert('Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const handleCompose = async (e) => {
        e.preventDefault();
        if (!compose.to || !compose.message) return;
        setSending(true);
        try {
            await axiosInstance.post('/api/messages', {
                receiverEmail: compose.to,
                subject: compose.subject || 'No subject',
                content: compose.message,
            });
            setCompose({ to: '', subject: '', message: '' });
            setShowCompose(false);
            fetchThreads();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const getOtherParty = (thread) => {
        return thread.senderEmail === user?.email
            ? thread.receiverEmail
            : thread.senderEmail;
    };

    const getOtherName = (thread) => {
        return thread.senderEmail === user?.email
            ? thread.receiverEmail.split('@')[0]
            : thread.senderName;
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    };

    if (loading) return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />
            <div className={styles.main}>
                <TopBar />
                <div className={styles.loading}>Loading messages...</div>
            </div>
            <BottomNav role={user?.role} />
        </div>
    );

    return (
        <div className={styles.layout}>
            <Sidebar role={user?.role} />

            <div className={styles.main}>
                <TopBar />

                <div className={styles.content}>
                    <div className={styles.messagesLayout}>

                        {/* Thread list */}
                        <div className={styles.threadList}>
                            <div className={styles.threadListHeader}>
                                <h2 className={styles.threadListTitle}>Messages</h2>
                                <button
                                    className={styles.composeBtn}
                                    onClick={() => setShowCompose(true)}
                                >
                                    ✏️ New
                                </button>
                            </div>

                            {threads.length === 0 ? (
                                <div className={styles.emptyThreads}>
                                    <p>✉️</p>
                                    <p>No messages yet</p>
                                </div>
                            ) : (
                                threads.map(thread => (
                                    <div
                                        key={thread.threadId}
                                        className={`${styles.threadItem} ${
                                            activeThread?.threadId === thread.threadId
                                                ? styles.threadItemActive : ''
                                        } ${!thread.read && !thread.mine ? styles.threadItemUnread : ''}`}
                                        onClick={() => openThread(thread)}
                                    >
                                        <div className={styles.threadAvatar}>
                                            {getOtherName(thread)?.[0]?.toUpperCase()}
                                        </div>
                                        <div className={styles.threadInfo}>
                                            <div className={styles.threadTop}>
                                                <span className={styles.threadName}>
                                                    {getOtherName(thread)}
                                                </span>
                                                <span className={styles.threadTime}>
                                                    {formatTime(thread.sentAt)}
                                                </span>
                                            </div>
                                            <p className={styles.threadSubject}>{thread.subject}</p>
                                            <p className={styles.threadPreview}>{thread.content}</p>
                                        </div>
                                        {!thread.read && !thread.mine && (
                                            <span className={styles.unreadDot} />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Chat view */}
                        <div className={styles.chatView}>
                            {!activeThread ? (
                                <div className={styles.noChatSelected}>
                                    <div className={styles.noChatIcon}>✉️</div>
                                    <h3 className={styles.noChatTitle}>Select a conversation</h3>
                                    <p className={styles.noChatSub}>
                                        Choose a conversation from the left or start a new one.
                                    </p>
                                    <button
                                        className={styles.composeBtn}
                                        onClick={() => setShowCompose(true)}
                                    >
                                        ✏️ New message
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Chat header */}
                                    <div className={styles.chatHeader}>
                                        <div className={styles.chatHeaderAvatar}>
                                            {getOtherName(activeThread)?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className={styles.chatHeaderName}>
                                                {getOtherName(activeThread)}
                                            </p>
                                            <p className={styles.chatHeaderSub}>
                                                {getOtherParty(activeThread)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Chat subject */}
                                    <div className={styles.chatSubject}>
                                        Re: {activeThread.subject}
                                    </div>

                                    {/* Messages */}
                                    <div className={styles.chatMessages}>
                                        {messages.map(msg => (
                                            <div
                                                key={msg.id}
                                                className={`${styles.bubble} ${
                                                    msg.mine ? styles.bubbleMine : styles.bubbleTheirs
                                                }`}
                                            >
                                                <p className={styles.bubbleText}>{msg.content}</p>
                                                <p className={styles.bubbleTime}>
                                                    {formatTime(msg.sentAt)}
                                                </p>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Reply box */}
                                    <form className={styles.replyBox} onSubmit={handleReply}>
                                        <textarea
                                            className={styles.replyInput}
                                            placeholder="Type a reply..."
                                            value={reply}
                                            onChange={e => setReply(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleReply(e);
                                                }
                                            }}
                                            rows={2}
                                        />
                                        <button
                                            type="submit"
                                            className={styles.sendBtn}
                                            disabled={sending || !reply.trim()}
                                        >
                                            {sending ? '...' : 'Send →'}
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Compose modal */}
            {showCompose && (
                <div className={styles.modalOverlay} onClick={() => setShowCompose(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>New Message</h3>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowCompose(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCompose}>
                            <div className={styles.modalField}>
                                <label className={styles.modalLabel}>To (email)</label>
                                <input
                                    className={styles.modalInput}
                                    type="email"
                                    placeholder="seller@example.com"
                                    value={compose.to}
                                    onChange={e => setCompose({ ...compose, to: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.modalField}>
                                <label className={styles.modalLabel}>Subject</label>
                                <input
                                    className={styles.modalInput}
                                    type="text"
                                    placeholder="e.g. Question about MacBook Air"
                                    value={compose.subject}
                                    onChange={e => setCompose({ ...compose, subject: e.target.value })}
                                />
                            </div>
                            <div className={styles.modalField}>
                                <label className={styles.modalLabel}>Message</label>
                                <textarea
                                    className={styles.modalTextarea}
                                    placeholder="Type your message..."
                                    rows={5}
                                    value={compose.message}
                                    onChange={e => setCompose({ ...compose, message: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.modalCancel}
                                    onClick={() => setShowCompose(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.modalSend}
                                    disabled={sending}
                                >
                                    {sending ? 'Sending...' : 'Send message'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <BottomNav role={user?.role} />
        </div>
    );
}