import { PaymentStatus } from "../../staticPayment/types/enums/paymentStatus.js";

const emojiIcon = Object.freeze({
    model: '🤖',
    help: '⁉',
    play: '▶',
    textDocument: '📃',
    panel: '📱',
    return: '🔙',
    point: '⚡',
    extraPoint: '🌟',
    statistics: '📊',
    list: '📃',
    user: '👤',
    users: '👥',
    cost: '💸',
    sparkle: '✨',
    info: 'ℹ',
    identifier: '🆔',
    free: '🆓',
    forbidden: '🚫',
    contact: '☎',
    ok: '✅',
    failed: '❌',
    delete: '❌',
    plus: '➕',
    channel: '📣',
    warning: '⚠',
    picture: '🖼',
    calendar: '📅',
    price: '💳',
    link: '🔗',
    refresh: '🔄',
    time: '🕐',
});

export default emojiIcon;

export const paymentStatusIcon = {
    [PaymentStatus.Open]: '🔵',
    [PaymentStatus.PendingApprove]: '🟠',
    [PaymentStatus.Approved]: '🟢',
    [PaymentStatus.Canceled]: '🟡',
    [PaymentStatus.Rejected]: '🔴',
} as const;
