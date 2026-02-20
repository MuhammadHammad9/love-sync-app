import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import L from 'leaflet';
import { MapPin, Plus, Save, Gift, Lock, Unlock, Navigation } from 'lucide-react';

// Fix Leaflet clean marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Custom Icons
const giftIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const myIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const partnerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to handle map clicks
function AddEventMarker({ isAdding, onAdd }) {
    useMapEvents({
        click(e) {
            if (isAdding) {
                onAdd(e.latlng);
            }
        },
    });
    return null;
}

function ChangeView({ center }) {
    const map = useMap();
    if (center) map.setView(center);
    return null;
}

import BottomSheet from './BottomSheet';

// ... (Imports remain the same)

export default function InvisibleStringMap() {
    const { profile, couple } = useAuth();
    const [myLocation, setMyLocation] = useState(null);
    const [partnerLocation, setPartnerLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [showDistance, setShowDistance] = useState(true);

    // Event State
    const [events, setEvents] = useState([]);
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [tempEventLocation, setTempEventLocation] = useState(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDesc, setNewEventDesc] = useState('');

    // Bottom Sheet State
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        // ... (Keep existing Geolocation & Subscription logic)
        // 1. Watch my position
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported, using fallback');
            setMyLocation({ lat: 33.6844, lng: 73.0479 }); // Islamabad fallback
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const newLoc = { lat: latitude, lng: longitude };
                setMyLocation(newLoc);

                // Update DB
                if (profile) {
                    await supabase
                        .from('profiles')
                        .update({ location: `POINT(${longitude} ${latitude})` }) // PostGIS format: LONG LAT
                        .eq('id', profile.id);
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                // Fallback location if permission denied or error
                if (!myLocation) {
                    setMyLocation({ lat: 33.6844, lng: 73.0479 }); // Islamabad fallback
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    useEffect(() => {
        if (!couple?.id) return;

        // 2. Poll/Subscribe partner location
        const channel = supabase.channel(`location:${couple.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `couple_id=eq.${couple.id}`
            }, (payload) => {
                if (payload.new.id !== profile.id && payload.new.location) {
                    const matches = payload.new.location.match(/\(([^)]+)\)/);
                    if (matches) {
                        const [lng, lat] = matches[1].split(' ').map(parseFloat);
                        setPartnerLocation({ lat, lng });
                    }
                }
            })
            .subscribe();

        // Initial fetch
        const fetchPartner = async () => {
            const { data: partner } = await supabase
                .from('profiles')
                .select('location')
                .eq('couple_id', couple.id)
                .neq('id', profile.id)
                .single();

            if (partner?.location) {
                const matches = partner.location.match(/\(([^)]+)\)/);
                if (matches) {
                    const [lng, lat] = matches[1].split(' ').map(parseFloat);
                    setPartnerLocation({ lat, lng });
                }
            }
        };
        fetchPartner();

        // 3. Fetch Events
        const fetchEvents = async () => {
            const { data } = await supabase
                .from('hidden_events')
                .select('*')
                .eq('couple_id', couple.id);

            if (data) {
                const parsedEvents = data.map(e => {
                    const matches = e.location.match(/\(([^)]+)\)/);
                    if (matches) {
                        const [lng, lat] = matches[1].split(' ').map(parseFloat);
                        return { ...e, lat, lng };
                    }
                    return null;
                }).filter(Boolean);
                setEvents(parsedEvents);
            }
        };
        fetchEvents();

        return () => supabase.removeChannel(channel);
    }, [couple, profile]);

    // Calculate Partner Distance
    useEffect(() => {
        if (myLocation && partnerLocation) {
            setDistance(calculateDistance(myLocation, partnerLocation));
        }
    }, [myLocation, partnerLocation]);

    const calculateDistance = (loc1, loc2) => {
        const R = 6371; // km
        const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
        const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(3); // 3 decimals for meters precisions
    };

    const handleMapClick = (latlng) => {
        setTempEventLocation(latlng);
        setIsAddingMode(false); // Switch to form mode
    };

    const saveEvent = async () => {
        if (!tempEventLocation || !newEventTitle) return;

        try {
            const locationString = `POINT(${tempEventLocation.lng} ${tempEventLocation.lat})`;
            const { data, error } = await supabase
                .from('hidden_events')
                .insert([{
                    couple_id: couple.id,
                    creator_id: profile.id,
                    location: locationString,
                    title: newEventTitle,
                    description: newEventDesc,
                    icon: 'gift'
                }])
                .select()
                .single();

            if (error) throw error;

            // Add to local state
            setEvents([...events, { ...data, lat: tempEventLocation.lat, lng: tempEventLocation.lng }]);

            // Reset UI
            setTempEventLocation(null);
            setNewEventTitle('');
            setNewEventDesc('');

        } catch (err) {
            console.error("Error saving event:", err);
            alert(`Failed to save location: ${err.message || "Unknown error"}`);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        if (!window.confirm("Are you sure you want to remove this memory? This cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from('hidden_events')
                .delete()
                .eq('id', selectedEvent.id);

            if (error) throw error;

            // Update local state
            setEvents(events.filter(e => e.id !== selectedEvent.id));
            setSelectedEvent(null);
        } catch (err) {
            console.error("Error deleting event:", err);
            alert("Failed to delete event.");
        }
    };

    if (!myLocation) return (
        <div className="h-80 flex flex-col items-center justify-center bg-white/5 rounded-2xl animate-pulse">
            <Navigation className="w-8 h-8 text-love-500 mb-2 animate-bounce" />
            <p className="text-sm text-white/50">Triangulating love coordinates...</p>
        </div>
    );

    return (
        <div className="relative w-full h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
            <MapContainer
                center={myLocation}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    className="map-tiles-dark filter grayscale contrast-125 brightness-75" // customized dark style
                />
                <ChangeView center={myLocation} />
                <AddEventMarker isAdding={isAddingMode} onAdd={handleMapClick} />

                {/* Users Markers */}
                <Marker position={myLocation} icon={myIcon}>
                    <Popup>You</Popup>
                </Marker>

                {partnerLocation && (
                    <>
                        <Marker position={partnerLocation} icon={partnerIcon}>
                            <Popup>Partner</Popup>
                        </Marker>
                        <Polyline positions={[myLocation, partnerLocation]} color="#ec4899" dashArray="5, 10" opacity={0.6} />
                    </>
                )}

                {/* Event Markers */}
                {events.map(event => {
                    // Check Proximity
                    const distKm = calculateDistance(myLocation, event);
                    const isUnlocked = distKm < 0.05; // 50 meters
                    // Also unlock if partner is close
                    const partnerDistKm = partnerLocation ? calculateDistance(partnerLocation, event) : 999;
                    const isPartnerClose = partnerDistKm < 0.05;

                    const effectiveUnlocked = isUnlocked || isPartnerClose || event.creator_id === profile.id;

                    return (
                        <Marker
                            key={event.id}
                            position={[event.lat, event.lng]}
                            icon={giftIcon}
                            opacity={effectiveUnlocked ? 1 : 0.7}
                            eventHandlers={{
                                click: () => setSelectedEvent({ ...event, unlocked: effectiveUnlocked, distKm })
                            }}
                        />
                    );
                })}
            </MapContainer>

            {/* Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-[100]">
                {/* Distance Badge */}
                {distance && showDistance && (
                    <div className="liquid-glass px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-white flex items-center gap-2">
                        <Navigation className="w-3 h-3 text-love-400" />
                        {distance} km apart
                    </div>
                )}
                {/* Toggle Distance Button */}
                {distance && (
                    <button
                        onClick={() => setShowDistance(!showDistance)}
                        className={`p-2 rounded-full shadow-lg transition-colors ${showDistance ? 'bg-white/10 text-white' : 'bg-black/60 text-white/50'}`}
                        title={showDistance ? "Hide Distance" : "Show Distance"}
                    >
                        <Navigation className={`w-4 h-4 ${showDistance ? 'text-love-400' : 'text-gray-400'}`} />
                    </button>
                )}
            </div>

            {/* Add Event Button */}
            <div className="absolute bottom-6 right-6 z-[100]">
                {!isAddingMode && !tempEventLocation && (
                    <button
                        onClick={() => setIsAddingMode(true)}
                        className="bg-love-600 hover:bg-love-500 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
                        title="Add Hidden Memory"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                )}
                {isAddingMode && (
                    <div className="liquid-glass px-4 py-2 rounded-full text-white text-sm font-medium border border-love-500 animate-pulse cursor-pointer" onClick={() => setIsAddingMode(false)}>
                        Tap map to place memory... (Cancel)
                    </div>
                )}
            </div>

            {/* VIEW EVENT BOTTOM SHEET (PROMPT 4) */}
            <BottomSheet
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                title={selectedEvent?.unlocked ? selectedEvent.title : "Locked Memory"}
            >
                {selectedEvent && (
                    <div className="space-y-4">
                        {selectedEvent.unlocked ? (
                            <>
                                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
                                    <Unlock className="w-6 h-6 text-green-400" />
                                    <div>
                                        <p className="text-sm font-bold text-green-200">Unlocked!</p>
                                        <p className="text-xs text-green-200/60">You are within range.</p>
                                    </div>
                                </div>
                                <div className="prose prose-invert">
                                    <p className="text-white/90 leading-relaxed text-lg">{selectedEvent.description}</p>
                                </div>
                                <p className="text-xs text-white/40 uppercase tracking-widest pt-4">
                                    Dropped by Partner
                                </p>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                    <Lock className="w-8 h-8 text-love-400" />
                                </div>
                                <div>
                                    <p className="text-white/60 mb-1">This memory is hidden.</p>
                                    <h4 className="text-xl font-bold text-white mb-2">{(selectedEvent.distKm * 1000).toFixed(0)} meters away</h4>
                                    <p className="text-xs text-love-300">Get closer (50m) to unlock the secret message.</p>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-4">
                                    <div
                                        className="h-full bg-love-500 transition-all duration-1000"
                                        style={{ width: `${Math.max(5, Math.min(100, (0.05 / selectedEvent.distKm) * 100))}%` }}
                                    />
                                </div>
                            </div>
                        )}


                        {/* Host controls (Delete) */}
                        {selectedEvent.creator_id === profile.id && (
                            <div className="pt-4 border-t border-white/5 mt-4">
                                <button
                                    onClick={handleDeleteEvent}
                                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold border border-red-500/20 transition-colors"
                                >
                                    Remove Memory
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </BottomSheet>

            {/* ADD EVENT BOTTOM SHEET (PROMPT 4) */}
            <BottomSheet
                isOpen={!!tempEventLocation}
                onClose={() => setTempEventLocation(null)}
                title="Drop a Secret"
            >
                <div className="space-y-4 pb-8">
                    <div className="flex items-center gap-2 mb-2 p-3 bg-love-500/10 rounded-lg border border-love-500/20">
                        <Gift className="w-5 h-5 text-love-500" />
                        <p className="text-xs text-love-200">
                            Planting a memory at this exact spot. Your partner must walk here to unlock it.
                        </p>
                    </div>

                    <div>
                        <label className="text-xs text-white/50 uppercase font-bold mb-1 block">Title</label>
                        <input
                            type="text"
                            value={newEventTitle}
                            onChange={e => setNewEventTitle(e.target.value)}
                            placeholder="e.g. Where we first met"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-love-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-white/50 uppercase font-bold mb-1 block">Secret Message</label>
                        <textarea
                            value={newEventDesc}
                            onChange={e => setNewEventDesc(e.target.value)}
                            placeholder="Write something sweet..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white h-32 focus:outline-none focus:border-love-500 resize-none transition-colors"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setTempEventLocation(null)}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveEvent}
                            disabled={!newEventTitle || !newEventDesc}
                            className="flex-1 py-4 bg-love-600 hover:bg-love-500 rounded-xl font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            <Save className="w-4 h-4" />
                            Plant Memory
                        </button>
                    </div>
                </div>
            </BottomSheet>

        </div>
    );
}
