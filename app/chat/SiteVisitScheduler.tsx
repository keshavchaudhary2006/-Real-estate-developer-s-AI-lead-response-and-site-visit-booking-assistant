'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Phone,
} from 'lucide-react';

interface Slot {
  id: number;
  date_time: string;
  is_booked: boolean;
  locked_until: string | null;
  project_id: string | null;
}

interface SiteVisitSchedulerProps {
  projectId?: string;
  lang?: 'en' | 'hi' | 'gu';
  defaultPhone?: string;
  defaultName?: string;
  onBookingConfirmed?: (bookingDetails: {
    slotId: number;
    dateTime: string;
    projectId: string;
    reraNumber: string;
  }) => void;
}

export default function SiteVisitScheduler({
  projectId,
  lang = 'en',
  defaultPhone = '',
  defaultName = '',
  onBookingConfirmed,
}: SiteVisitSchedulerProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [lockingSlot, setLockingSlot] = useState(false);
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Buyer contact details for booking confirmation
  const [buyerName, setBuyerName] = useState(defaultName || 'Valued Buyer');
  const [buyerPhone, setBuyerPhone] = useState(defaultPhone || '');

  // Fetch only unbooked and unlocked slots
  const fetchAvailableSlots = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const url = projectId
        ? `/api/slots/available?project_id=${encodeURIComponent(projectId)}`
        : '/api/slots/available';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setSlots(data.data || []);
      } else {
        setErrorMessage(data.error || 'Failed to fetch available slots.');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableSlots();
  }, [projectId]);

  // Live Countdown Timer for the 2-Minute Lock
  useEffect(() => {
    if (!lockExpiresAt) return;

    const interval = setInterval(() => {
      const diffMs = lockExpiresAt.getTime() - Date.now();
      const secs = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(secs);

      if (secs <= 0) {
        clearInterval(interval);
        handleLockExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockExpiresAt]);

  const handleLockExpired = async () => {
    if (selectedSlotId) {
      try {
        await fetch(`/api/slots/${selectedSlotId}/unlock`, { method: 'POST' });
      } catch (e) {
        // Silent unlock attempt
      }
    }
    setSelectedSlotId(null);
    setLockExpiresAt(null);
    setErrorMessage(
      lang === 'hi'
        ? 'आपकी 2 मिनट की अस्थायी बुकिंग समाप्त हो गई है। कृपया पुनः स्लॉट चुनें।'
        : lang === 'gu'
        ? 'આપની 2 મિનિટની અસ્થાયી બુકિંગ સમાપ્ત થઈ ગઈ છે. કૃપા કરીને ફરી સ્લોટ પસંદ કરો.'
        : 'Your 2-minute temporary reservation has expired. Please select a slot again.'
    );
    fetchAvailableSlots();
  };

  // User Clicks a Slot -> APPLY CRITICAL 2-MINUTE LOCK
  const handleSlotClick = async (slotId: number) => {
    setErrorMessage(null);

    // If another slot was locked previously by this session, release it first
    if (selectedSlotId && selectedSlotId !== slotId) {
      try {
        await fetch(`/api/slots/${selectedSlotId}/unlock`, { method: 'POST' });
      } catch (e) {}
    }

    setLockingSlot(true);
    try {
      // POST /api/slots/:id/lock with { durationMinutes: 2 }
      const res = await fetch(`/api/slots/${slotId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: 2 }),
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedSlotId(slotId);
        const expiresAt = new Date(data.locked_until);
        setLockExpiresAt(expiresAt);
        const secs = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
        setRemainingSeconds(secs);
      } else {
        // Double-booking prevention error returned from database
        setErrorMessage(
          data.error || 'This slot is currently locked by another buyer. Please select another time.'
        );
        fetchAvailableSlots();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLockingSlot(false);
    }
  };

  // User Confirms Booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) return;

    if (!buyerPhone || buyerPhone.trim().length < 8) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया बुकिंग पुष्टि के लिए वैध फ़ोन नंबर दर्ज करें।'
          : lang === 'gu'
          ? 'કૃપા કરી માન્ય ફોન નંબર દાખલ કરો.'
          : 'Please enter a valid phone number to confirm your booking.'
      );
      return;
    }

    setConfirmingBooking(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/slots/${selectedSlotId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: buyerName,
          phone: buyerPhone,
          project_id: projectId || 'Project 1',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookingSuccess(data);
        setLockExpiresAt(null);
        if (onBookingConfirmed) {
          const rera =
            (data.slot?.project_id || projectId) === 'Project 2'
              ? 'PRM/KA/RERA/1251/308/PR/210215/004050'
              : 'PRM/KA/RERA/1251/310/PR/210101/004001';

          onBookingConfirmed({
            slotId: selectedSlotId,
            dateTime: data.slot.date_time,
            projectId: data.slot.project_id || projectId || 'Project 1',
            reraNumber: rera,
          });
        }
      } else {
        setErrorMessage(data.error || 'Failed to confirm booking.');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setConfirmingBooking(false);
    }
  };

  // Cancel and Unlock
  const handleCancelSelection = async () => {
    if (selectedSlotId) {
      try {
        await fetch(`/api/slots/${selectedSlotId}/unlock`, { method: 'POST' });
      } catch (e) {}
    }
    setSelectedSlotId(null);
    setLockExpiresAt(null);
    fetchAvailableSlots();
  };

  // Group slots by Date for a clean calendar UI
  const groupedSlots: { [dateStr: string]: Slot[] } = {};
  slots.forEach((s) => {
    const d = new Date(s.date_time);
    const dateKey = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!groupedSlots[dateKey]) groupedSlots[dateKey] = [];
    groupedSlots[dateKey].push(s);
  });

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full rounded-2xl border border-neutral-200 bg-white p-4 space-y-4 shadow-sm text-neutral-900 transition font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wider uppercase text-neutral-900">
              {lang === 'hi' ? 'साइट विज़िट शेड्यूलर' : lang === 'gu' ? 'મુલાકાત શેડ્યૂલર' : 'Site Visit Scheduling'}
            </h3>
            <p className="text-[10px] text-neutral-500">
              {projectId ? `Showing open slots for ${projectId}` : 'Verified slots from VisitSlots table'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchAvailableSlots}
          disabled={loading || Boolean(selectedSlotId)}
          className="text-neutral-400 hover:text-black p-1 transition disabled:opacity-30"
          title="Refresh available slots"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Booking Success Receipt Card */}
      {bookingSuccess ? (
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              {lang === 'hi' ? 'साइट विज़िट सफलतापूर्वक बुक हुई!' : lang === 'gu' ? 'મુલાકાત સફળતાપૂર્વક નોંધાઈ ગઈ!' : 'Site Visit Confirmed!'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-neutral-800 font-mono bg-white p-3 rounded-lg border border-neutral-200">
            <div>
              <span className="text-neutral-500">Slot ID: </span>
              <span className="font-semibold">#{bookingSuccess.slot?.id}</span>
            </div>
            <div>
              <span className="text-neutral-500">Date & Time: </span>
              <span className="font-semibold text-neutral-900">
                {new Date(bookingSuccess.slot?.date_time).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Project: </span>
              <span className="font-semibold text-neutral-900">
                {bookingSuccess.slot?.project_id || projectId || 'Project 1'}
              </span>
            </div>
            {bookingSuccess.lead && (
              <div>
                <span className="text-neutral-500">Lead Phone: </span>
                <span className="font-semibold">{bookingSuccess.lead.phone}</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
            <span>
              RERA Reg: {(bookingSuccess.slot?.project_id || projectId) === 'Project 2' ? 'PRM/KA/RERA/1251/308/PR/210215/004050' : 'PRM/KA/RERA/1251/310/PR/210101/004001'}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Active 2-Minute Lock Warning Banner */}
          {selectedSlotId && lockExpiresAt && (
            <div className="p-3.5 rounded-xl bg-neutral-900 text-white space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Lock className="w-3.5 h-3.5 animate-pulse" />
                  {lang === 'hi' ? '2 मिनट अस्थायी लॉक सक्रिय' : lang === 'gu' ? '2 મિનિટ અસ્થાયી લોક સક્રિય' : '2-Minute Temporary Lock Active'}
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-bold tracking-wider">
                  {formatTimer(remainingSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                {lang === 'hi'
                  ? 'यह स्लॉट आपके लिए 2 मिनट के लिए सुरक्षित है ताकि कोई अन्य इसे बुक न कर सके। कृपया पुष्टि करें:'
                  : lang === 'gu'
                  ? 'આ સ્લોટ આપના માટે 2 મિનિટ માટે સુરક્ષિત છે જેથી ડબલ-બુકિંગ ન થાય. કૃપા કરી કન્ફર્મ કરો:'
                  : 'This slot is temporarily locked in the database to prevent double-booking. Confirm below to finalize:'}
              </p>

              {/* Confirmation Form */}
              <form onSubmit={handleConfirmBooking} className="pt-1.5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Your Name"
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="Phone (9876543210)"
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={confirmingBooking}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-white hover:bg-neutral-200 text-neutral-900 font-semibold text-xs transition shadow-sm"
                  >
                    {confirmingBooking ? 'Confirming...' : 'Confirm Booking'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelSelection}
                    className="py-1.5 px-3 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Slots Calendar List */}
          {loading ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              <span className="inline-block animate-spin mr-2">⟳</span>
              Loading available visit slots...
            </div>
          ) : Object.keys(groupedSlots).length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-500 space-y-2">
              <Clock className="w-5 h-5 mx-auto text-neutral-400" />
              <p>No open slots available right now. All slots are booked or currently locked.</p>
              <button
                onClick={fetchAvailableSlots}
                className="text-[11px] underline text-neutral-700 hover:text-black"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                Select an Open Date & Time:
              </div>

              {Object.entries(groupedSlots).map(([dateStr, dateSlots]) => (
                <div key={dateStr} className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    {dateStr}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {dateSlots.map((slot) => {
                      const isSelected = selectedSlotId === slot.id;
                      const timeStr = new Date(slot.date_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotClick(slot.id)}
                          disabled={lockingSlot || Boolean(selectedSlotId && !isSelected)}
                          className={`p-2.5 rounded-xl border text-left transition duration-150 flex items-center justify-between ${
                            isSelected
                              ? 'bg-neutral-900 border-neutral-900 text-white ring-2 ring-neutral-400/50'
                              : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800 disabled:opacity-40'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3 opacity-60" />
                              {timeStr}
                            </div>
                            <div className="text-[10px] opacity-70 font-mono mt-0.5">
                              {slot.project_id || 'All Projects'}
                            </div>
                          </div>

                          {isSelected ? (
                            <Lock className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Understated Compliance Footnote */}
      <div className="text-[9px] text-neutral-400 font-mono border-t border-neutral-100 pt-2 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-neutral-500" />
          <span>Atomic 2-minute lock anti-collision protection</span>
        </span>
        <span>Karnataka RERA Compliant</span>
      </div>
    </div>
  );
}
