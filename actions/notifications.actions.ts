/**
 * actions/notifications.actions.ts
 *
 * @deprecated — This file is a backward-compatibility shim only.
 *
 * All notification logic has been consolidated under @/domain/notifications.
 * Existing callers that have not yet been updated will continue to work,
 * but new code should import directly from "@/domain/notifications".
 *
 * TODO: Once all consumers are migrated, delete this file.
 */

export {
    createNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getMyNotifications,
} from "@/domain/notifications";
