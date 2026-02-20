export async function requestNotificationPermission() {
    if (!('Notification' in window)) {

        return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
}

export async function subscribeToPushMessages() {
    if (!('serviceWorker' in navigator)) return null;

    try {
        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
            return existingSubscription;
        }

        // Subscribe (Mocking VAPID key for now since we don't have backend yet)
        // In real app, fetch public key from server
        // const response = await fetch('/api/vapid-public-key');
        // const vapidPublicKey = await response.text();

        // For Gap Analysis MVP, we just verify the structure works

        return null;

        /* 
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
        return subscription;
        */

    } catch (error) {
        console.error("Failed to subscribe to push:", error);
        return null;
    }
}

// Utility to notify user (local) if push isn't ready
export function sendLocalNotification(title, options) {
    if (Notification.permission === 'granted') {
        // Try Service Worker first
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
            }).catch(() => {
                // Fallback if SW fails
                new Notification(title, options);
            });
        } else {
            // Fallback for no SW support
            new Notification(title, options);
        }
    }
}
