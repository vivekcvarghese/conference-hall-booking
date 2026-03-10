// Date Utilities
const todayObj = new Date();
const tomorrowObj = new Date();
tomorrowObj.setDate(tomorrowObj.getDate() + 1);

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const todayStr = formatDate(todayObj);
const tomorrowStr = formatDate(tomorrowObj);

let selectedDate = todayStr;

const BASE_SLOTS = [
    { time: '09:00 AM - 10:00 AM', startHour: 9 },
    { time: '10:00 AM - 11:00 AM', startHour: 10 },
    { time: '11:00 AM - 12:00 PM', startHour: 11 },
    { time: '12:00 PM - 01:00 PM', startHour: 12 },
    { time: '01:00 PM - 02:00 PM', startHour: 13 },
    { time: '02:00 PM - 03:00 PM', startHour: 14 },
    { time: '03:00 PM - 04:00 PM', startHour: 15 },
    { time: '04:00 PM - 05:00 PM', startHour: 16 },
    { time: '05:00 PM - 06:00 PM', startHour: 17 }
];

// State Management
let slots = [];

// DOM Elements
const slotsContainer = document.getElementById('slots-container');
const bookingsList = document.getElementById('bookings-list');
const bookingModal = document.getElementById('booking-modal');
const closeModalBtn = document.getElementById('close-modal');
const bookingForm = document.getElementById('booking-form');
const modalSlotTime = document.getElementById('modal-slot-time');
const slotIdInput = document.getElementById('slot-id');

const btnToday = document.getElementById('btn-today');
const btnTomorrow = document.getElementById('btn-tomorrow');

// Custom Dialog Elements
const customDialog = document.getElementById('custom-dialog');
const dialogTitle = document.getElementById('custom-dialog-title');
const dialogMessage = document.getElementById('custom-dialog-message');
const dialogInput = document.getElementById('custom-dialog-input');
const dialogActions = document.getElementById('custom-dialog-actions');

// Custom Dialog Helpers
function showCustomDialog(options) {
    return new Promise((resolve) => {
        dialogTitle.textContent = options.title || 'Notification';
        dialogMessage.innerHTML = options.message || ''; // Allow HTML for formatted messages

        dialogActions.innerHTML = '';

        if (options.type === 'prompt') {
            dialogInput.style.display = 'block';
            dialogInput.value = '';
            dialogInput.focus();
        } else {
            dialogInput.style.display = 'none';
        }

        const handleClose = (value) => {
            customDialog.classList.remove('active');
            resolve(value);
        };

        if (options.type === 'alert') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = 'OK';
            btn.onclick = () => handleClose(true);
            dialogActions.appendChild(btn);
        } else if (options.type === 'confirm' || options.type === 'prompt') {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn';
            cancelBtn.style.border = '1px solid var(--card-border)';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => handleClose(null);

            const confirmBtn = document.createElement('button');
            confirmBtn.className = options.confirmClass || 'btn btn-primary';
            confirmBtn.textContent = options.confirmText || 'Confirm';
            confirmBtn.onclick = () => {
                if (options.type === 'prompt') {
                    handleClose(dialogInput.value);
                } else {
                    handleClose(true);
                }
            };

            dialogActions.appendChild(cancelBtn);
            dialogActions.appendChild(confirmBtn);
        }

        customDialog.classList.add('active');
    });
}

function customAlert(message) {
    return showCustomDialog({ type: 'alert', message });
}

function customConfirm(message, confirmText = 'Confirm', confirmClass = 'btn btn-danger') {
    return showCustomDialog({ type: 'confirm', message, confirmText, confirmClass, title: 'Are you sure?' });
}

function customPrompt(message) {
    return showCustomDialog({ type: 'prompt', message, title: 'Authentication Required' });
}

if (btnToday && btnTomorrow) {
    btnToday.addEventListener('click', () => {
        selectedDate = todayStr;
        updateDateToggleUI();
        renderSlots();
    });
    btnTomorrow.addEventListener('click', () => {
        selectedDate = tomorrowStr;
        updateDateToggleUI();
        renderSlots();
    });
}

function updateDateToggleUI() {
    if (selectedDate === todayStr) {
        btnToday.className = 'btn btn-primary';
        btnToday.style.background = 'var(--accent)';
        btnToday.style.border = 'none';
        btnToday.style.color = '#000000'; // Make text black for contrast on glowing green
        btnTomorrow.className = 'btn';
        btnTomorrow.style.background = 'transparent';
        btnTomorrow.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        btnTomorrow.style.color = 'white';
    } else {
        btnTomorrow.className = 'btn btn-primary';
        btnTomorrow.style.background = 'var(--accent)';
        btnTomorrow.style.border = 'none';
        btnTomorrow.style.color = '#000000'; // Make text black for contrast on glowing green
        btnToday.className = 'btn';
        btnToday.style.background = 'transparent';
        btnToday.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        btnToday.style.color = 'white';
    }
}

// Fetch initial data from server
async function fetchSlots() {
    try {
        const response = await fetch('/api/slots');
        let data = await response.json();

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        let initialCount = data.length;

        // Migrate old data if necessary (slots without a date)
        let mappedSlots = data.map(s => {
            if (!s.date) {
                s.date = todayStr;
                s.id = `${todayStr}-${s.id}`;
            }

            // Recompute startHour correctly by only looking at the start time string
            let startTimeStr = s.time.split('-')[0];
            let hourStr = startTimeStr.split(':')[0].trim();
            let isPM = startTimeStr.includes('PM');
            let hour = parseInt(hourStr, 10);
            if (isPM && hour !== 12) hour += 12;
            if (!isPM && hour === 12) hour = 0;
            s.startHour = hour;

            return s;
        });

        // Purge memory: filter out any dates older than today
        slots = mappedSlots.filter(s => {
            if (!s.date) return true;

            const parts = s.date.split('-');
            const slotYear = parseInt(parts[0], 10);
            const slotMonth = parseInt(parts[1], 10);
            const slotDay = parseInt(parts[2], 10);

            if (slotYear < currentYear) return false;
            if (slotYear === currentYear && slotMonth < currentMonth) return false;
            if (slotYear === currentYear && slotMonth === currentMonth && slotDay < currentDay) return false;

            return true;
        });

        const purgedOldData = slots.length < initialCount;

        const addedToday = ensureSlotsForDate(todayStr);
        const addedTomorrow = ensureSlotsForDate(tomorrowStr);

        if (addedToday || addedTomorrow || purgedOldData) {
            saveState(); // sync newly generated base slots or push purged state
        }

        updateDateToggleUI();
        renderSlots();
        renderBookings();
    } catch (error) {
        console.error('Error fetching slots:', error);
        customAlert('Could not connect to the booking server. Please ensure the server is running.');
    }
}

function ensureSlotsForDate(dateStr) {
    let added = false;
    BASE_SLOTS.forEach((bs, index) => {
        const exists = slots.some(s => s.date === dateStr && s.time === bs.time);
        if (!exists) {
            slots.push({
                id: `${dateStr}-${index + 1}-v2`, // Ensures uniqueness
                date: dateStr,
                time: bs.time,
                startHour: bs.startHour,
                status: 'available'
            });
            added = true;
        }
    });

    // Ensure they stay sorted
    if (added) {
        slots.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startHour - b.startHour;
        });
    }

    return added;
}

// Save state to server
async function saveState() {
    try {
        await fetch('/api/slots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(slots),
        });
    } catch (error) {
        console.error('Error saving slots:', error);
        customAlert('Failed to save booking to server.');
    }
}

// Render the grid of slots
function renderSlots() {
    slotsContainer.innerHTML = '';

    let slotsToShow = slots.filter(s => s.date === selectedDate);

    // Filter expired
    const now = new Date();
    const currentHour = now.getHours();
    const isToday = selectedDate === todayStr;

    let visibleCount = 0;

    slotsToShow.forEach(slot => {
        // Hide expired slots
        // The slot should be hidden if the current hour is >= the starting hour + 1
        // meaning the hour block has finished
        if (isToday && currentHour >= (slot.startHour + 1)) {
            return;
        }

        visibleCount++;
        const isBooked = slot.status === 'booked';

        const card = document.createElement('div');
        card.className = `slot-card ${isBooked ? 'booked' : 'available'}`;

        let detailsHtml = '';
        if (isBooked) {
            detailsHtml = `
        <div class="slot-details">
          Reserved by <strong>${slot.bookerName}</strong>
        </div>
      `;
        } else {
            detailsHtml = `
        <div class="slot-details">
          Ready for booking
        </div>
        <button class="btn btn-primary book-btn" data-id="${slot.id}">Book Now</button>
      `;
        }

        card.innerHTML = `
      <div>
        <div class="slot-time">${slot.time}</div>
        <div class="slot-status">
          <span class="status-dot"></span>
          ${isBooked ? 'Unavailable' : 'Available'}
        </div>
        ${detailsHtml}
      </div>
    `;

        slotsContainer.appendChild(card);
    });

    if (visibleCount === 0) {
        slotsContainer.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted); background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--card-border);">
            <p>No available slots remaining for this date.</p>
          </div>
        `;
    }

    // Attach event listeners to new Book buttons
    document.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            openModal(id);
        });
    });
}

// Render the aside bookings list
function renderBookings() {
    // Only show booked slots that haven't expired, or maybe show all?
    // User requested to hide past day bookings
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const bookedSlots = slots.filter(s => {
        if (s.status !== 'booked') return false;

        // Filter out past days
        if (s.date) {
            const parts = s.date.split('-');
            const slotYear = parseInt(parts[0], 10);
            const slotMonth = parseInt(parts[1], 10);
            const slotDay = parseInt(parts[2], 10);

            if (slotYear < currentYear) return false;
            if (slotYear === currentYear && slotMonth < currentMonth) return false;
            if (slotYear === currentYear && slotMonth === currentMonth && slotDay < currentDay) return false;
        }
        return true;
    });

    // Sort bookings by date and then startHour
    bookedSlots.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startHour - b.startHour;
    });

    bookingsList.innerHTML = '';

    if (bookedSlots.length === 0) {
        bookingsList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; opacity: 0.5;">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <p>No bookings have been made yet.</p>
      </div>
    `;
        return;
    }

    bookedSlots.forEach(slot => {
        const item = document.createElement('div');
        item.className = 'booking-item';

        let displayDate = slot.date === todayStr ? 'Today' : (slot.date === tomorrowStr ? 'Tomorrow' : slot.date);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentDay = now.getDate();
        const currentHour = now.getHours();

        // slot.date is in format "YYYY-MM-DD"
        let isExpired = false;
        if (slot.date) {
            const parts = slot.date.split('-');
            const slotYear = parseInt(parts[0], 10);
            const slotMonth = parseInt(parts[1], 10);
            const slotDay = parseInt(parts[2], 10);

            if (slotYear < currentYear) {
                isExpired = true;
            } else if (slotYear === currentYear && slotMonth < currentMonth) {
                isExpired = true;
            } else if (slotYear === currentYear && slotMonth === currentMonth && slotDay < currentDay) {
                isExpired = true;
            } else if (slotYear === currentYear && slotMonth === currentMonth && slotDay === currentDay) {
                // It is today, check the hour
                if (currentHour >= (slot.startHour + 1)) {
                    isExpired = true;
                }
            }
            console.log(`Checking expiration for ${slot.date} ${slot.time}: slotDate=${slotYear}-${slotMonth}-${slotDay}, current=${currentYear}-${currentMonth}-${currentDay}, startHour=${slot.startHour}, currentHour=${currentHour} -> isExpired=${isExpired}`);
        }

        item.innerHTML = `
      <div class="booking-item-header">
        <span class="booking-item-time" style="color: var(--accent);">${displayDate} • ${slot.time}</span>
      </div>
      <div class="booking-item-name"><strong>${slot.bookerName}</strong> (${slot.bookerEmail})</div>
      <div class="booking-item-purpose">"${slot.purpose}"</div>
      ${!isExpired ? `<button class="btn btn-danger cancel-btn" data-id="${slot.id}" style="margin-top: 1rem;">Cancel Booking</button>` : `<div style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem; font-style: italic;">Booking Expired</div>`}
    `;

        bookingsList.appendChild(item);
    });

    // Attach cancel events
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            cancelBooking(id);
        });
    });
}

// Modal logic
function openModal(id) {
    const slot = slots.find(s => s.id === id);
    if (!slot) return;

    slotIdInput.value = id;
    let displayDate = slot.date === todayStr ? 'Today' : (slot.date === tomorrowStr ? 'Tomorrow' : slot.date);
    modalSlotTime.textContent = `${displayDate} • ${slot.time}`;
    bookingForm.reset();

    bookingModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling in background
}

function closeModal() {
    bookingModal.classList.remove('active');
    document.body.style.overflow = '';
}

closeModalBtn.addEventListener('click', closeModal);
bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) closeModal();
});

// Handle Booking Submit
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = slotIdInput.value;
    const name = document.getElementById('booker-name').value;
    const email = document.getElementById('booker-email').value;
    const purpose = document.getElementById('booking-purpose').value;

    // Generate a random 4-digit PIN for cancellation
    const cancelPin = Math.floor(1000 + Math.random() * 9000).toString();

    const slotIndex = slots.findIndex(s => s.id === id);
    if (slotIndex > -1) {
        slots[slotIndex] = {
            ...slots[slotIndex],
            status: 'booked',
            bookerName: name,
            bookerEmail: email,
            purpose: purpose,
            cancelPassword: cancelPin
        };

        closeModal();
        renderSlots();
        renderBookings();
        // Update server state
        await saveState();

        // Notify the user of their cancellation PIN
        await customAlert(`Booking Confirmed!<br><br>Your Cancellation PIN is: <strong style="color:var(--accent);font-size:1.5rem;">${cancelPin}</strong><br><br>Please save this PIN. You will need it if you wish to cancel this booking later.`);
    }
});

// Handle Cancel
async function cancelBooking(id) {
    const password = await customPrompt('Enter the cancellation password or contact admin to proceed:');
    if (!password) return; // User clicked cancel on prompt or entered nothing

    const slot = slots.find(s => s.id === id);
    if (!slot) return;

    // Check if password matches admin password OR the slot's specific cancellation password
    const isAdmin = password === 'vivek123!@#';
    const isOwner = slot.cancelPassword && password === slot.cancelPassword;

    if (!isAdmin && !isOwner) {
        await customAlert('Incorrect password. Cancellation aborted.');
        return;
    }

    const confirmed = await customConfirm('Password accepted.<br><br>Are you sure you want to cancel this booking? This action cannot be undone.');
    if (confirmed) {
        const slotIndex = slots.findIndex(s => s.id === id);
        if (slotIndex > -1) {
            slots[slotIndex] = {
                id: slots[slotIndex].id,
                time: slots[slotIndex].time,
                date: slots[slotIndex].date,
                startHour: slots[slotIndex].startHour,
                status: 'available'
            };

            renderSlots();
            renderBookings();
            // Update server state
            await saveState();
        }
    }
}

// Initialize
function init() {
    fetchSlots();
}

document.addEventListener('DOMContentLoaded', init);
