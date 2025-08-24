// Sound functionality removed for test version

// Main Habit Tracker class
class HabitTracker {
    constructor() {
        try {
            // Load data from localStorage or initialize empty
            this.habits = this.loadFromStorage('habits') || [];
            this.progress = this.loadFromStorage('progress') || {};
            
            // Initialize date tracking
            this.selectedDate = new Date();
            this.currentMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth());
            this.timers = {};
            this.checkpointReached = {}; // Track if checkpoint has been reached for each habit
            this.editingHabitId = null;
            this.lastKnownDate = new Date().toDateString();
            this.pendingChartData = null; // Track chart data for rendering when tab becomes visible
            
            // Statistics tracking - ensure proper initialization
            this.statsWeekStart = this.getWeekStart(new Date());
            
            // Load or initialize streak data with validation
            const savedStreakData = this.loadFromStorage('streakData');
            if (savedStreakData && typeof savedStreakData.currentStreak === 'number') {
                this.streakData = savedStreakData;
            } else {
                console.log('Initializing new streak data');
                this.streakData = { currentStreak: 0, lastStreakDate: null };
            }
            
            console.log('Constructor - Streak data initialized:', this.streakData);
            
            this.init();
            
            // Start performance monitoring for optimization tracking
            this.startPerformanceMonitoring();
        } catch (error) {
            console.error('Failed to initialize HabitTracker:', error);
            this.habits = [];
            this.progress = {};
            this.streakData = { currentStreak: 0, lastStreakDate: null };
        }
    }
    
    // Initialize the app
    init() {
        try {
            this.checkForDateChange();
            this.updateCurrentDate();
            this.renderTodayHabits();
            this.renderCalendar();
            this.renderHabitsList();
            this.startTimerUpdates();
            this.startDailyCheck();
            
            // Initialize statistics and check streak on app start
            this.updateStreak();
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }
    
    // Load data from localStorage with error handling
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Failed to load ${key} from localStorage:`, error);
            return null;
        }
    }
    
    // Generate unique ID for habits
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Save data to localStorage with error handling
    saveData() {
        try {
            localStorage.setItem('habits', JSON.stringify(this.habits));
            localStorage.setItem('progress', JSON.stringify(this.progress));
            localStorage.setItem('streakData', JSON.stringify(this.streakData));
        } catch (error) {
            console.error('Failed to save data to localStorage:', error);
        }
    }
    
    // Update date displays
    updateCurrentDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        
        // Update main header date
        const mainDateElement = document.querySelector('header > div#current-date');
        if (mainDateElement) {
            mainDateElement.textContent = this.selectedDate.toLocaleDateString('en-US', options);
        }
        
        // Update Today tab date
        const todayTabDateElement = document.getElementById('today-current-date');
        if (todayTabDateElement) {
            todayTabDateElement.textContent = this.selectedDate.toLocaleDateString('en-US', options);
        }
        
        // Update Calendar tab month/year
        const calendarMonthElement = document.getElementById('calendar-month');
        if (calendarMonthElement) {
            calendarMonthElement.textContent = this.currentMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
        }
    }
    
    // Navigate between days
    changeDay(delta) {
        this.selectedDate.setDate(this.selectedDate.getDate() + delta);
        
        // Update currentMonth if needed
        const selectedMonthKey = `${this.selectedDate.getFullYear()}-${this.selectedDate.getMonth()}`;
        const currentMonthKey = `${this.currentMonth.getFullYear()}-${this.currentMonth.getMonth()}`;
        if (selectedMonthKey !== currentMonthKey) {
            this.currentMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth());
            const activeTab = document.querySelector('.tab-btn.active')?.textContent.toLowerCase();
            if (activeTab === 'calendar') {
                this.renderCalendar();
            }
        }
        
        this.updateCurrentDate();
        this.renderTodayHabits();
    }
    
    // Check if date has changed since last run
    checkForDateChange() {
        const todayString = new Date().toDateString();
        if (this.lastKnownDate !== todayString) {
            this.selectedDate = new Date();
            this.currentMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth());
            this.lastKnownDate = todayString;
            this.updateCurrentDate();
            this.renderTodayHabits();
            this.renderCalendar();
        }
    }
    
    // Navigate between months
    changeMonth(delta) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
        this.renderCalendar();
        this.renderStatsCalendar(); // Also update the stats calendar
        this.updateCurrentDate();
    }
    
    // Render compact calendar for statistics page
    renderStatsCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Update month display
        const monthSpan = document.getElementById('stats-calendar-month');
        if (monthSpan) {
            monthSpan.textContent = this.currentMonth.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
            });
        }
        
        const calendar = document.querySelector('.stats-calendar');
        if (!calendar) {
            return;
        }
        
        // Clear existing days (except headers)
        while (calendar.children.length > 7) {
            calendar.removeChild(calendar.lastChild);
        }
        
        // Get first day of month and days in month
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const today = new Date();
        
        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = daysInPrevMonth - i;
            calendar.appendChild(dayElement);
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(year, month, i);
            const dateKey = this.getDateKey(currentDate);
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = i;
            
            // Check if today
            if (currentDate.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            // Check if has progress
            const dailyCompletion = this.calculateDayCompletion(currentDate);
            if (dailyCompletion > 0) {
                dayElement.classList.add('has-progress');
            }
            
            // Add click handler to switch to today tab
            dayElement.addEventListener('click', (function(selectedDate) {
                return function() {
                    habitTracker.selectedDate = selectedDate;
                    habitTracker.updateCurrentDate();
                    habitTracker.renderTodayHabits();
                    switchTab('today', document.querySelector('.tab-btn[onclick*="today"]'));
                };
            })(currentDate));
            
            calendar.appendChild(dayElement);
        }
        
        // Next month days (to fill remaining slots)
        const totalCells = 42; // 6 rows * 7 days
        const remainingCells = totalCells - (firstDay + daysInMonth);
        for (let i = 1; i <= remainingCells && calendar.children.length < totalCells; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = i;
            calendar.appendChild(dayElement);
        }
    }
    
    // Get date key in YYYY-MM-DD format
    getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Start daily date change check - optimized
    startDailyCheck() {
        // Reduce frequency to check every 5 minutes instead of every minute
        setInterval(() => {
            this.checkForDateChange();
        }, 5 * 60 * 1000); // Check every 5 minutes
    }
    
    // Check if habit is active on a specific day
    isHabitActiveOnDay(habit, date) {
        if (!habit.days || habit.days.length === 0) return true;
        const dayOfWeek = date.getDay();
        return habit.days.some(savedDay => parseInt(savedDay, 10) === dayOfWeek);
    }
    
    // Get habit progress for a specific date
    getHabitProgress(habitId, date) {
        const dateKey = this.getDateKey(date);
        const dateProgress = this.progress[dateKey];
        
        // Check if date is locked (has snapshot)
        if (dateProgress && dateProgress.lockedSnapshot) {
            return dateProgress.lockedSnapshot[habitId] !== undefined ?
                dateProgress.lockedSnapshot[habitId] :
                this.getDefaultProgress(habitId);
        } else {
            return dateProgress?.[habitId] || this.getDefaultProgress(habitId);
        }
    }
    
    // Get default progress value based on habit type
    getDefaultProgress(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return null;
        
        switch (habit.type) {
            case 'checkbox':
                return habit.tasks && habit.tasks.length > 0 ? [] : false;
            case 'slider': return 0;
            case 'timer': return 0;
            default: return null;
        }
    }
    
    // Update habit progress
    updateHabitProgress(habitId, date, value, triggerRender = true) {
        const dateKey = this.getDateKey(date);
        const habit = this.habits.find(h => h.id === habitId);
        
        if (!habit) {
            console.warn(`Habit ${habitId} not found.`);
            return;
        }
        
        // Enforce timer goal limit
        if (habit.type === 'timer' && habit.goalTime) {
            value = Math.min(value, habit.goalTime);
        }
        
        // Prevent updates if day is locked
        if (this.progress[dateKey]?.lockedSnapshot) {
            return; // Day is locked, ignore update
        }
        
        // Proceed with update
        if (!this.progress[dateKey]) {
            this.progress[dateKey] = {};
        }
        this.progress[dateKey][habitId] = value;
        
        this.saveData();
        
        // ALWAYS recalculate streak on ANY date change (past, present, or future)
        this.updateStreak();
        
        if (triggerRender !== false) {
            const activeTab = document.querySelector('.tab-btn.active')?.textContent.toLowerCase();
            if (activeTab === 'today') {
                this.renderTodayHabits();
            } else if (activeTab === 'statistics') {
                this.renderStatistics();
            }
        }
    }
    
    // Update slider value display
    updateSliderValue(valueElement, habitId, value) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) {
            console.warn(`Slider habit ${habitId} not found for update.`);
            return;
        }
        valueElement.textContent = `${value}/${habit.maxValue || 100}`;
        this.updateHabitProgress(habitId, this.selectedDate, parseInt(value, 10), false);
    }
    
    // Start timer for a habit
    startTimer(habitId) {
        if (this.timers[habitId]) {
            return;
        }
        
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) {
            console.warn(`Timer habit ${habitId} not found.`);
            return;
        }
        
        // Always reset checkpoint reached flag when starting/restarting
        this.checkpointReached[habitId] = false;
        
        this.timers[habitId] = setInterval(() => {
            const current = this.getHabitProgress(habitId, this.selectedDate);
            
            if (habit.goalTime && current >= habit.goalTime) {
                this.stopTimer(habitId);
                return;
            }
            
            // Check for checkpoint crossing - trigger 1 second before actual checkpoint
            if (habit.checkpointTime && !this.checkpointReached[habitId]) {
                const nextSecond = current + 1;
                const checkpointTime = habit.checkpointTime;
                
                // Check if we're 1 second before a checkpoint (e.g., at 4:59 for a 5:00 checkpoint)
                const secondsUntilNextCheckpoint = checkpointTime - (nextSecond % checkpointTime);
                const isOneSecondBeforeCheckpoint = (nextSecond + 1) % checkpointTime === 0;
                
                if (isOneSecondBeforeCheckpoint && nextSecond >= checkpointTime - 1) {
                    this.checkpointReached[habitId] = true;
                    this.stopTimer(habitId);
                    
                    // Advance timer by 1 second when checkpoint is triggered
                    const newProgressTime = nextSecond + 1;
                    this.updateHabitProgress(habitId, this.selectedDate, newProgressTime, false);
                    this.updateTimerDisplay(habitId);
                    
                    // Show checkpoint notification with the actual checkpoint time
                    const checkpointMinutes = Math.floor(newProgressTime / 60);
                    this.showCheckpointNotification(habitId, checkpointMinutes);
                    return;
                }
            }
            
            // This will automatically trigger comprehensive streak recalculation
            this.updateHabitProgress(habitId, this.selectedDate, current + 1, false);
            this.updateTimerDisplay(habitId);
        }, 1000);
    }
    
    // Show checkpoint notification
    showCheckpointNotification(habitId, minutes) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;
        
        // Remove any existing notifications for this habit
        const existingNotification = document.querySelector(`[data-habit-id="${habitId}"]`);
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = 'checkpoint-notification';
        notification.setAttribute('data-habit-id', habitId);
        notification.innerHTML = `
            <div class="checkpoint-content">
                <span class="checkpoint-icon">🏁</span>
                <span class="checkpoint-text">${minutes}MIN CHECKPOINT REACHED</span>
                <div class="checkpoint-buttons">
                    <button class="checkpoint-continue" onclick="habitTracker.handleCheckpointContinue('${habitId}')">CONTINUE</button>
                    <button class="checkpoint-dismiss" onclick="habitTracker.handleCheckpointDismiss('${habitId}')">DISMISS</button>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds if not clicked
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
                // Don't auto-continue, keep timer stopped
            }
        }, 10000);
    }
    
    // Continue timer after checkpoint
    continueTimer(habitId) {
        // Reset checkpoint flag to allow timer to continue without immediately triggering again
        this.checkpointReached[habitId] = false;
        this.startTimer(habitId);
    }
    
    // Handle checkpoint continue button click
    handleCheckpointContinue(habitId) {
        // Remove the notification
        const notification = document.querySelector(`[data-habit-id="${habitId}"]`);
        if (notification) {
            notification.remove();
        }
        
        // Continue the timer
        this.continueTimer(habitId);
    }
    
    // Handle checkpoint dismiss button click
    handleCheckpointDismiss(habitId) {
        // Remove the notification but keep timer paused
        const notification = document.querySelector(`[data-habit-id="${habitId}"]`);
        if (notification) {
            notification.remove();
        }
        
        // Reset checkpoint flag to allow future triggering but don't start timer
        this.checkpointReached[habitId] = false;
    }
    
    // Stop timer for a habit
    stopTimer(habitId) {
        if (this.timers[habitId]) {
            clearInterval(this.timers[habitId]);
            delete this.timers[habitId];
        }
        // Keep checkpoint reached flag to prevent immediate re-triggering
        // It will be reset when timer starts again
    }
    
    // Reset timer for a habit
    resetTimer(habitId) {
        this.stopTimer(habitId);
        // Reset checkpoint tracking
        this.checkpointReached[habitId] = false;
        // This will automatically trigger comprehensive streak recalculation
        this.updateHabitProgress(habitId, this.selectedDate, 0);
        this.updateTimerDisplay(habitId);
    }
    
    // Update timer display - optimized version
    updateTimerDisplay(habitId) {
        // Cache habit lookup to avoid repeated array searches
        const habit = this.habitLookupCache?.[habitId] || this.habits.find(h => h.id === habitId);
        if (!habit) return;
        
        // Cache habit in lookup cache for future use
        if (!this.habitLookupCache) this.habitLookupCache = {};
        this.habitLookupCache[habitId] = habit;
        
        const progress = this.getHabitProgress(habitId, this.selectedDate);
        const minutes = Math.floor(progress / 60);
        const seconds = progress % 60;
        const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Cache DOM elements to avoid repeated queries
        if (!this.timerElementCache) this.timerElementCache = {};
        if (!this.timerElementCache[habitId]) {
            this.timerElementCache[habitId] = {
                display: document.getElementById(`timer-${habitId}`),
                fill: document.getElementById(`timer-fill-${habitId}`)
            };
        }
        
        const { display: displayElement, fill: fillElement } = this.timerElementCache[habitId];
        
        if (displayElement) {
            const goalMinutesDisplay = habit.goalTime ? ` / ${Math.floor((habit.goalTime || 0) / 60)} min` : '';
            displayElement.textContent = `${displayTime}${goalMinutesDisplay}`;
        }
        
        if (fillElement) {
            let progressPercent = 0;
            if (habit.goalTime && habit.goalTime > 0) {
                progressPercent = Math.min((progress / habit.goalTime) * 100, 100);
            }
            fillElement.style.width = `${progressPercent}%`;
        }
    }
    
    // Start periodic timer updates - optimized version
    startTimerUpdates() {
        // Reduce update frequency and only update visible running timers
        setInterval(() => {
            // Only update if we have active timers and we're on the today tab
            const activeTab = document.querySelector('.tab-btn.active')?.textContent.toLowerCase();
            if (activeTab !== 'today' || Object.keys(this.timers).length === 0) {
                return;
            }
            
            // Only update timers that are actually running
            Object.keys(this.timers).forEach(habitId => {
                // Check if timer element exists before updating
                const timerElement = document.getElementById(`timer-${habitId}`);
                if (timerElement && this.timers[habitId]) {
                    this.updateTimerDisplay(habitId);
                }
            });
        }, 1000);
    }
    
    // Debounce utility for performance optimization
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Performance monitoring utility
    startPerformanceMonitoring() {
        this.performanceMetrics = {
            renderStart: 0,
            renderEnd: 0,
            timerUpdateCount: 0,
            lastTimerUpdate: 0
        };
        
        // Monitor render performance
        const originalRenderTodayHabits = this.renderTodayHabits;
        this.renderTodayHabits = () => {
            this.performanceMetrics.renderStart = performance.now();
            originalRenderTodayHabits.call(this);
            this.performanceMetrics.renderEnd = performance.now();
            console.log(`[PERF] renderTodayHabits took ${(this.performanceMetrics.renderEnd - this.performanceMetrics.renderStart).toFixed(2)}ms`);
        };
        
        // Monitor timer updates
        const originalUpdateTimerDisplay = this.updateTimerDisplay;
        this.updateTimerDisplay = (habitId) => {
            this.performanceMetrics.timerUpdateCount++;
            this.performanceMetrics.lastTimerUpdate = performance.now();
            originalUpdateTimerDisplay.call(this, habitId);
        };
        
        // Log performance summary every 30 seconds
        setInterval(() => {
            console.log('[PERF] Summary:', {
                timerUpdatesLast30s: this.performanceMetrics.timerUpdateCount,
                cacheHits: Object.keys(this.habitLookupCache || {}).length,
                domCacheSize: Object.keys(this.domElementCache || {}).length
            });
            this.performanceMetrics.timerUpdateCount = 0;
        }, 30000);
    }
    
    // Clear caches when habits or DOM changes
    clearPerformanceCaches() {
        this.habitLookupCache = {};
        this.timerElementCache = {};
        this.domElementCache = {};
    }
    renderTodayHabits() {
        // Cache DOM element lookup
        if (!this.domElementCache) this.domElementCache = {};
        if (!this.domElementCache.todayHabitsContainer) {
            this.domElementCache.todayHabitsContainer = document.getElementById('today-habits');
        }
        
        const container = this.domElementCache.todayHabitsContainer;
        if (!container) {
            console.error("Today habits container not found!");
            return;
        }
        
        // Clear performance caches when re-rendering
        this.clearPerformanceCaches();
        
        const dateKey = this.getDateKey(this.selectedDate);
        const isLocked = !!this.progress[dateKey]?.lockedSnapshot;
        
        container.innerHTML = '';
        
        // Add locked day indicator if needed
        if (isLocked) {
            const lockedIndicator = document.createElement('div');
            lockedIndicator.className = 'locked-day-indicator';
            lockedIndicator.innerHTML = `This day is locked. <button class="unlock-btn" onclick="habitTracker.unlockDay('${dateKey}')">Unlock</button>`;
            container.appendChild(lockedIndicator);
        }
        
        let habitsToRender = [];
        if (isLocked) {
            // If locked, only render habits that exist in the snapshot
            const snapshot = this.progress[dateKey].lockedSnapshot;
            habitsToRender = this.habits.filter(habit => snapshot.hasOwnProperty(habit.id));
        } else {
            // If not locked, render active habits normally
            habitsToRender = this.habits.filter(habit =>
                this.isHabitActiveOnDay(habit, this.selectedDate)
            );
        }
        
        if (habitsToRender.length === 0) {
            container.innerHTML += '<p>NO HABITS TO DISPLAY FOR THIS DAY.</p>';
            return;
        }
        
        habitsToRender.forEach(habit => {
            const card = this.createHabitCard(habit);
            container.appendChild(card);
        });
    }
    
    // Unlock a day from the UI
    unlockDay(dateKey) {
        this.toggleDayLock(dateKey);
    }
    
    // Create a habit card element
    createHabitCard(habit) {
        const card = document.createElement('div');
        card.className = 'habit-card';
        card.style.setProperty('--habit-color', habit.color || '#4facfe');
        
        // Get current progress for slider display
        const currentProgress = this.getHabitProgress(habit.id, this.selectedDate);
        let progressInfo = '';
        if (habit.type === 'slider') {
            const maxValue = habit.maxValue || 100;
            const currentValue = (typeof currentProgress === 'number' && !isNaN(currentProgress)) ? currentProgress : 0;
            progressInfo = `<div class="slider-progress-info">${currentValue}/${maxValue}</div>`;
        }
        
        const header = document.createElement('div');
        header.className = 'habit-header';
        header.innerHTML = `
            <div class="habit-name">${habit.name}</div>
            ${progressInfo}
            <div class="habit-controls">
                <button class="control-btn edit-btn" onclick="habitTracker.editHabit('${habit.id}')">EDIT</button>
                <button class="control-btn delete-btn" onclick="habitTracker.deleteHabit('${habit.id}')">DELETE</button>
            </div>
        `;
        
        const progressDiv = document.createElement('div');
        progressDiv.className = 'habit-progress';
        const progress = this.getHabitProgress(habit.id, this.selectedDate);
        
        switch (habit.type) {
            case 'checkbox':
                if (habit.tasks && habit.tasks.length > 0) {
                    const subTasksDiv = document.createElement('div');
                    subTasksDiv.className = 'sub-tasks-habit';
                    habit.tasks.forEach(task => {
                        const taskItem = document.createElement('div');
                        taskItem.className = 'sub-task-item';
                        const isChecked = Array.isArray(progress) && progress.includes(task.name);
                        const taskId = `task-${habit.id}-${this.sanitizeTaskName(task.name)}`;
                        taskItem.innerHTML = `
                            <input type="checkbox" id="${taskId}" ${isChecked ? 'checked' : ''}>
                            <label for="${taskId}">${task.name}</label>
                        `;
                        const checkbox = taskItem.querySelector('input[type="checkbox"]');
                        checkbox.addEventListener('change', () => {
                            this.updateMultiTaskProgress(habit.id, this.selectedDate, task.name, checkbox.checked);
                        });
                        subTasksDiv.appendChild(taskItem);
                    });
                    progressDiv.appendChild(subTasksDiv);
                } else {
                    progressDiv.innerHTML = `
                        <div class="checkbox-habit">
                            <label><input type="checkbox" ${progress ? 'checked' : ''} onchange="habitTracker.updateHabitProgress('${habit.id}', habitTracker.selectedDate, this.checked, false)">MARK AS COMPLETED</label>
                        </div>
                    `;
                }
                break;
                
            case 'slider':
                const maxValueForHabit = (habit.maxValue && parseInt(habit.maxValue, 10)) || 100;
                const initialProgressValue = (typeof progress === 'number' && !isNaN(progress)) ? progress : 0;
                const boundedInitialValue = Math.max(0, Math.min(initialProgressValue, maxValueForHabit));
                
                progressDiv.innerHTML = `
                    <div class="slider-habit">
                        <div class="slider-habit-container" id="slider-container-${habit.id}" data-max-value="${maxValueForHabit}" data-habit-id="${habit.id}">
                            <div class="slider-progress-fill" id="slider-fill-${habit.id}"></div>
                            <div class="slider-display" id="slider-display-${habit.id}">${Math.round((boundedInitialValue / maxValueForHabit) * 100)}%</div>
                        </div>
                    </div>
                `;
                
                const sliderContainer = progressDiv.querySelector(`#slider-container-${habit.id}`);
                const sliderFill = progressDiv.querySelector(`#slider-fill-${habit.id}`);
                const sliderDisplay = progressDiv.querySelector(`#slider-display-${habit.id}`);
                
                // Set initial progress fill
                const initialPercent = maxValueForHabit > 0 ? (boundedInitialValue / maxValueForHabit) * 100 : 0;
                sliderFill.style.width = `${initialPercent}%`;
                
                const updateSliderProgress = (percent) => {
                    const newValue = Math.round((percent / 100) * maxValueForHabit);
                    sliderFill.style.width = `${percent}%`;
                    sliderDisplay.textContent = `${Math.round(percent)}%`;
                    
                    // Update progress info in header
                    const progressInfo = card.querySelector('.slider-progress-info');
                    if (progressInfo) {
                        progressInfo.textContent = `${newValue}/${maxValueForHabit}`;
                    }
                    
                    return newValue;
                };
                
                // Create debounced update function for better performance
                const debouncedProgressUpdate = this.debounce((habitId, value) => {
                    this.updateHabitProgress(habitId, this.selectedDate, value, false);
                }, 150);
                
                const sliderHabitIdCapture = habit.id; // Capture the habitId for closure
                sliderContainer.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Prevent text selection
                    
                    const updateProgress = (event) => {
                        const rect = sliderContainer.getBoundingClientRect();
                        let percent = (event.clientX - rect.left) / rect.width;
                        percent = Math.max(0, Math.min(1, percent)) * 100;
                        const newValue = updateSliderProgress(percent);
                        
                        debouncedProgressUpdate(sliderHabitIdCapture, newValue);
                    };
                    
                    // Initial update on mousedown (click-to-jump functionality)
                    updateProgress(e);
                    
                    let isDragging = false;
                    
                    const onMove = (moveEvent) => {
                        moveEvent.preventDefault();
                        isDragging = true;
                        updateProgress(moveEvent);
                    };
                    
                    const onUp = (upEvent) => {
                        upEvent.preventDefault();
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                        document.body.style.userSelect = ''; // Restore text selection
                    };
                    
                    // Disable text selection while dragging
                    document.body.style.userSelect = 'none';
                    
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });
                
                // Add touch support for mobile devices
                sliderContainer.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    
                    const updateProgress = (touch) => {
                        const rect = sliderContainer.getBoundingClientRect();
                        let percent = (touch.clientX - rect.left) / rect.width;
                        percent = Math.max(0, Math.min(1, percent)) * 100;
                        const newValue = updateSliderProgress(percent);
                        
                        debouncedProgressUpdate(sliderHabitIdCapture, newValue);
                    };
                    
                    // Initial update on touchstart (touch-to-jump functionality)
                    const touch = e.touches[0];
                    updateProgress(touch);
                    
                    const onTouchMove = (moveEvent) => {
                        moveEvent.preventDefault();
                        const touch = moveEvent.touches[0];
                        updateProgress(touch);
                    };
                    
                    const onTouchEnd = (endEvent) => {
                        endEvent.preventDefault();
                        document.removeEventListener('touchmove', onTouchMove);
                        document.removeEventListener('touchend', onTouchEnd);
                    };
                    
                    document.addEventListener('touchmove', onTouchMove, { passive: false });
                    document.addEventListener('touchend', onTouchEnd);
                });
                break;
                
            case 'timer':
                const initialProgress = this.getHabitProgress(habit.id, this.selectedDate);
                const initialMinutes = Math.floor(initialProgress / 60);
                const initialSeconds = initialProgress % 60;
                const initialDisplayTime = `${initialMinutes.toString().padStart(2, '0')}:${initialSeconds.toString().padStart(2, '0')}`;
                const goalMinutesDisplay = habit.goalTime ? ` / ${Math.floor((habit.goalTime || 0) / 60)} min` : '';
                
                progressDiv.innerHTML = `
                    <div class="timer-habit">
                        <div class="timer-habit-container" id="timer-container-${habit.id}">
                            <div class="timer-progress-fill" id="timer-fill-${habit.id}"></div>
                            <div class="timer-display" id="timer-${habit.id}">${initialDisplayTime}${goalMinutesDisplay}</div>
                        </div>
                        <button class="timer-btn start-btn" onclick="habitTracker.startTimer('${habit.id}')">START</button>
                        <button class="timer-btn stop-btn" onclick="habitTracker.stopTimer('${habit.id}')">STOP</button>
                        <button class="timer-btn reset-btn" onclick="habitTracker.resetTimer('${habit.id}')">RESET</button>
                    </div>
                `;
                
                // Add checkpoint markers if checkpoint is set
                if (habit.checkpointTime && habit.goalTime) {
                    const timerContainer = progressDiv.querySelector(`#timer-container-${habit.id}`);
                    const checkpointInterval = habit.checkpointTime;
                    const totalTime = habit.goalTime;
                    
                    // Calculate checkpoint positions
                    let checkpointTime = checkpointInterval;
                    while (checkpointTime < totalTime) {
                        const checkpointPercent = (checkpointTime / totalTime) * 100;
                        const marker = document.createElement('div');
                        marker.className = 'timer-checkpoint-marker';
                        marker.style.left = `${checkpointPercent}%`;
                        marker.title = `Checkpoint: ${Math.floor(checkpointTime / 60)}m ${checkpointTime % 60}s`;
                        timerContainer.appendChild(marker);
                        
                        checkpointTime += checkpointInterval;
                    }
                }
                
                const timerContainer = progressDiv.querySelector(`#timer-container-${habit.id}`);
                const habitIdCapture = habit.id; // Capture the habitId for closure
                timerContainer.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Prevent text selection
                    
                    const updateProgress = (event) => {
                        const rect = timerContainer.getBoundingClientRect();
                        let percent = (event.clientX - rect.left) / rect.width;
                        percent = Math.max(0, Math.min(1, percent));
                        const newSeconds = habit.goalTime ? Math.round(percent * habit.goalTime) : Math.round(percent * 3600);
                        
                        // When manually adjusting, always reset checkpoint flag to allow re-triggering
                        this.checkpointReached[habitIdCapture] = false;
                        
                        this.updateHabitProgress(habitIdCapture, this.selectedDate, newSeconds, false);
                        this.updateTimerDisplay(habitIdCapture);
                    };
                    
                    // Initial update on mousedown (click-to-jump functionality)
                    updateProgress(e);
                    
                    let isDragging = false;
                    
                    const onMove = (moveEvent) => {
                        moveEvent.preventDefault();
                        isDragging = true;
                        updateProgress(moveEvent);
                    };
                    
                    const onUp = (upEvent) => {
                        upEvent.preventDefault();
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                        document.body.style.userSelect = ''; // Restore text selection
                    };
                    
                    // Disable text selection while dragging
                    document.body.style.userSelect = 'none';
                    
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });
                
                // Add touch support for mobile devices
                timerContainer.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    
                    const updateProgress = (touch) => {
                        const rect = timerContainer.getBoundingClientRect();
                        let percent = (touch.clientX - rect.left) / rect.width;
                        percent = Math.max(0, Math.min(1, percent));
                        const newSeconds = habit.goalTime ? Math.round(percent * habit.goalTime) : Math.round(percent * 3600);
                        
                        // When manually adjusting, always reset checkpoint flag to allow re-triggering
                        this.checkpointReached[habitIdCapture] = false;
                        
                        this.updateHabitProgress(habitIdCapture, this.selectedDate, newSeconds, false);
                        this.updateTimerDisplay(habitIdCapture);
                    };
                    
                    // Initial update on touchstart (touch-to-jump functionality)
                    const touch = e.touches[0];
                    updateProgress(touch);
                    
                    const onTouchMove = (moveEvent) => {
                        moveEvent.preventDefault();
                        const touch = moveEvent.touches[0];
                        updateProgress(touch);
                    };
                    
                    const onTouchEnd = (endEvent) => {
                        endEvent.preventDefault();
                        document.removeEventListener('touchmove', onTouchMove);
                        document.removeEventListener('touchend', onTouchEnd);
                    };
                    
                    document.addEventListener('touchmove', onTouchMove, { passive: false });
                    document.addEventListener('touchend', onTouchEnd);
                });
                
                setTimeout(() => {
                    try {
                        this.updateTimerDisplay(habitIdCapture);
                    } catch (e) {
                        console.error(`Error setting initial timer display for habit ${habitIdCapture}:`, e);
                    }
                }, 0);
                break;
        }
        
        card.appendChild(header);
        card.appendChild(progressDiv);
        return card;
    }
    
    // Sanitize task name for use as ID
    sanitizeTaskName(name) {
        return name.replace(/[^a-zA-Z0-9-_]/g, '_');
    }
    
    // Update progress for multi-task checkbox habit
    updateMultiTaskProgress(habitId, date, taskName, isChecked, triggerRender = false) {
        let currentProgress = this.getHabitProgress(habitId, date);
        
        if (!Array.isArray(currentProgress)) {
            currentProgress = [];
        }
        
        if (isChecked) {
            if (!currentProgress.includes(taskName)) {
                currentProgress.push(taskName);
            }
        } else {
            const index = currentProgress.indexOf(taskName);
            if (index > -1) {
                currentProgress.splice(index, 1);
            }
        }
        
        // This will automatically trigger comprehensive streak recalculation for any date
        this.updateHabitProgress(habitId, date, currentProgress, triggerRender);
        
        console.log('Multi-task progress updated:', {
            habitId,
            taskName,
            isChecked,
            newProgress: currentProgress,
            dateKey: this.getDateKey(date)
        });
    }
    
    // Render calendar view - optimized
    renderCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        const monthSpan = document.getElementById('calendar-month');
        if (monthSpan) {
            monthSpan.textContent = this.currentMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
        }
        
        // Cache calendar element
        if (!this.domElementCache) this.domElementCache = {};
        if (!this.domElementCache.calendar) {
            this.domElementCache.calendar = document.querySelector('.calendar');
        }
        
        const calendar = this.domElementCache.calendar;
        if (!calendar) {
            console.error("Calendar container not found!");
            return;
        }
        
        // Remove existing event delegation before re-rendering
        if (this.calendarClickHandler) {
            calendar.removeEventListener('click', this.calendarClickHandler);
        }
        
        // Clear existing days (except headers)
        while (calendar.children.length > 7) {
            calendar.removeChild(calendar.lastChild);
        }
        
        // Get first day of month and last day of previous month
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.style.opacity = '0.3';
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = daysInPrevMonth - i;
            
            const progressIndicator = document.createElement('div');
            progressIndicator.className = 'progress-indicator';
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.width = '0%';
            progressIndicator.appendChild(progressBar);
            
            const progressPercent = document.createElement('div');
            progressPercent.className = 'progress-percent';
            progressPercent.textContent = '0%';
            
            const lockBtn = document.createElement('button');
            lockBtn.className = 'lock-btn';
            lockBtn.innerHTML = '🔒';
            lockBtn.disabled = true;
            lockBtn.title = "Cannot lock previous month's dates";
            lockBtn.style.color = 'rgba(255, 255, 255, 0.2)';
            
            dayElement.appendChild(dayNumber);
            dayElement.appendChild(progressIndicator);
            dayElement.appendChild(progressPercent);
            dayElement.appendChild(lockBtn);
            calendar.appendChild(dayElement);
        }
        
        // Current month days
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(year, month, i);
            const dateKey = this.getDateKey(currentDate);
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            if (currentDate.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            if (currentDate.toDateString() === this.selectedDate.toDateString()) {
                dayElement.classList.add('selected');
            }
            
            const isLocked = this.progress[dateKey]?.lockedSnapshot !== undefined;
            if (isLocked) {
                dayElement.classList.add('locked');
            }
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = i;
            
            const progressIndicator = document.createElement('div');
            progressIndicator.className = 'progress-indicator';
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            
            let avgProgress = 0;
            if (isLocked) {
                const snapshot = this.progress[dateKey].lockedSnapshot;
                const snapshotHabitIds = Object.keys(snapshot);
                
                if (snapshotHabitIds.length > 0) {
                    let totalWeightedProgress = 0;
                    let totalWeight = 0;
                    
                    snapshotHabitIds.forEach(habitId => {
                        const habit = this.habits.find(h => h.id === habitId);
                        if (!habit) {
                            return;
                        }
                        
                        const progressData = snapshot[habitId];
                        const weight = habit.weight || 1.0;
                        
                        let progressPercent = 0;
                        switch (habit.type) {
                            case 'checkbox':
                                if (habit.tasks && habit.tasks.length > 0) {
                                    const completedTasks = Array.isArray(progressData) ? progressData : [];
                                    progressPercent = habit.tasks.length > 0 ? (completedTasks.length / habit.tasks.length) * 100 : 0;
                                } else {
                                    progressPercent = (progressData === true) ? 100 : 0;
                                }
                                break;
                            case 'slider':
                                progressPercent = (progressData / (habit.maxValue || 100)) * 100;
                                break;
                            case 'timer':
                                if (habit.goalTime && habit.goalTime > 0) {
                                    progressPercent = (progressData / habit.goalTime) * 100;
                                } else {
                                    progressPercent = 0;
                                }
                                progressPercent = Math.min(progressPercent, 100);
                                break;
                        }
                        totalWeightedProgress += (progressPercent * weight);
                        totalWeight += weight;
                    });
                    avgProgress = totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
                }
            } else {
                const activeHabits = this.habits.filter(habit =>
                    this.isHabitActiveOnDay(habit, currentDate)
                );
                
                if (activeHabits.length > 0) {
                    let totalWeightedProgress = 0;
                    let totalWeight = 0;
                    
                    activeHabits.forEach(habit => {
                        const progressData = this.getHabitProgress(habit.id, currentDate);
                        const weight = habit.weight || 1.0;
                        
                        let progressPercent = 0;
                        switch (habit.type) {
                            case 'checkbox':
                                if (habit.tasks && habit.tasks.length > 0) {
                                    const completedTasks = Array.isArray(progressData) ? progressData : [];
                                    progressPercent = habit.tasks.length > 0 ? (completedTasks.length / habit.tasks.length) * 100 : 0;
                                } else {
                                    progressPercent = (progressData === true) ? 100 : 0;
                                }
                                break;
                            case 'slider':
                                progressPercent = (progressData / (habit.maxValue || 100)) * 100;
                                break;
                            case 'timer':
                                if (habit.goalTime && habit.goalTime > 0) {
                                    progressPercent = (progressData / habit.goalTime) * 100;
                                } else {
                                    progressPercent = 0;
                                }
                                progressPercent = Math.min(progressPercent, 100);
                                break;
                        }
                        totalWeightedProgress += (progressPercent * weight);
                        totalWeight += weight;
                    });
                    avgProgress = totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
                }
            }
            
            progressBar.style.width = `${avgProgress}%`;
            progressIndicator.appendChild(progressBar);
            
            const progressPercent = document.createElement('div');
            progressPercent.className = 'progress-percent';
            progressPercent.textContent = `${Math.round(avgProgress)}%`;
            
            const lockBtn = document.createElement('button');
            lockBtn.className = 'lock-btn';
            lockBtn.innerHTML = isLocked ? '🔒' : '🔓';
            lockBtn.title = isLocked ? "Unlock progress for this day" : "Lock progress for this day";
            
            dayElement.appendChild(dayNumber);
            dayElement.appendChild(progressIndicator);
            dayElement.appendChild(progressPercent);
            dayElement.appendChild(lockBtn);
            
            // Add data attributes for event delegation instead of individual listeners
            dayElement.dataset.dateKey = dateKey;
            dayElement.dataset.dateString = currentDate.toDateString();
            dayElement.dataset.isCurrentMonth = 'true';
            
            calendar.appendChild(dayElement);
        }
        
        // Next month days (to fill the grid)
        const totalCells = 42; // 6 rows * 7 days
        const remainingCells = totalCells - (firstDay + daysInMonth);
        for (let i = 1; i <= remainingCells; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.style.opacity = '0.3';
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = i;
            
            const progressIndicator = document.createElement('div');
            progressIndicator.className = 'progress-indicator';
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.width = '0%';
            progressIndicator.appendChild(progressBar);
            
            const progressPercent = document.createElement('div');
            progressPercent.className = 'progress-percent';
            progressPercent.textContent = '0%';
            
            const lockBtn = document.createElement('button');
            lockBtn.className = 'lock-btn';
            lockBtn.innerHTML = '🔒';
            lockBtn.disabled = true;
            lockBtn.title = "Cannot lock next month's dates";
            lockBtn.style.color = 'rgba(255, 255, 255, 0.2)';
            
            dayElement.appendChild(dayNumber);
            dayElement.appendChild(progressIndicator);
            dayElement.appendChild(progressPercent);
            dayElement.appendChild(lockBtn);
            calendar.appendChild(dayElement);
        }
        
        // Add single event delegation handler for better performance
        this.calendarClickHandler = (e) => {
            const calendarDay = e.target.closest('.calendar-day');
            if (!calendarDay) return;
            
            // Handle lock button clicks
            if (e.target.classList.contains('lock-btn')) {
                e.stopPropagation();
                const dateKey = calendarDay.dataset.dateKey;
                if (dateKey) {
                    this.toggleDayLock(dateKey);
                }
                return;
            }
            
            // Handle day selection clicks
            if (calendarDay.dataset.isCurrentMonth === 'true') {
                const dateString = calendarDay.dataset.dateString;
                if (dateString) {
                    this.selectedDate = new Date(dateString);
                    this.updateCurrentDate();
                    this.renderTodayHabits();
                    switchTab('today', document.querySelector('.tab-btn[onclick*="today"]'));
                }
            }
        };
        
        calendar.addEventListener('click', this.calendarClickHandler);
    }
    
    // Toggle day lock status
    toggleDayLock(dateKey) {
        if (!this.progress[dateKey]) {
            this.progress[dateKey] = {};
        }
        
        const isCurrentlyLocked = this.progress[dateKey].lockedSnapshot !== undefined;
        
        if (isCurrentlyLocked) {
            // Unlock the day
            delete this.progress[dateKey].lockedSnapshot;
            
            if (Object.keys(this.progress[dateKey]).length === 0) {
                delete this.progress[dateKey];
            }
            
            // Sync habits upon unlocking
            const unlockDate = new Date(dateKey);
            
            if (!this.progress[dateKey]) {
                this.progress[dateKey] = {};
            }
            
            this.habits.forEach(habit => {
                if (this.isHabitActiveOnDay(habit, unlockDate)) {
                    if (this.progress[dateKey][habit.id] === undefined) {
                        const defaultProgress = this.getDefaultProgress(habit.id);
                        this.progress[dateKey][habit.id] = defaultProgress;
                    }
                }
            });
            
            this.saveData();
            this.renderCalendar();
            
            if (dateKey === this.getDateKey(this.selectedDate)) {
                this.renderTodayHabits();
            }
        } else {
            // Lock the day
            const snapshot = {};
            
            this.habits.forEach(habit => {
                if (this.isHabitActiveOnDay(habit, new Date(dateKey))) {
                    const currentProgress = this.progress[dateKey]?.[habit.id];
                    
                    if (currentProgress !== undefined) {
                        snapshot[habit.id] = currentProgress;
                    } else {
                        const defaultProgress = this.getDefaultProgress(habit.id);
                        snapshot[habit.id] = defaultProgress;
                    }
                }
            });
            
            this.progress[dateKey].lockedSnapshot = snapshot;
            
            this.saveData();
            this.renderCalendar();
            
            if (dateKey === this.getDateKey(this.selectedDate)) {
                this.renderTodayHabits();
            }
        }
    }
    
    // Render habits list view
    renderHabitsList() {
        const container = document.getElementById('habits-list');
        if (!container) {
            console.error("Habits list container not found!");
            return;
        }
        
        container.innerHTML = '';
        
        if (this.habits.length === 0) {
            container.innerHTML = '<p>NO HABITS CREATED YET. CLICK "ADD NEW HABIT" TO GET STARTED.</p>';
            return;
        }
        
        this.habits.forEach(habit => {
            const card = document.createElement('div');
            card.className = 'habit-card';
            
            const header = document.createElement('div');
            header.className = 'habit-header';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'habit-name';
            nameDiv.textContent = habit.name;
            
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'habit-controls';
            
            const editButton = document.createElement('button');
            editButton.className = 'control-btn edit-btn';
            editButton.textContent = 'EDIT';
            editButton.onclick = () => this.editHabit(habit.id);
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'control-btn delete-btn';
            deleteButton.textContent = 'DELETE';
            deleteButton.onclick = () => this.deleteHabit(habit.id);
            
            controlsDiv.appendChild(editButton);
            controlsDiv.appendChild(deleteButton);
            header.appendChild(nameDiv);
            header.appendChild(controlsDiv);
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'habit-info';
            let infoText = `TYPE: ${habit.type.charAt(0).toUpperCase() + habit.type.slice(1).toUpperCase()}`;
            
            if (habit.type === 'timer' && habit.goalTime) {
                infoText += ` (GOAL: ${Math.floor(habit.goalTime / 60)}M ${habit.goalTime % 60}S`;
                if (habit.checkpointTime) {
                    infoText += `, CHECKPOINTS: ${Math.floor(habit.checkpointTime / 60)}M`;
                }
                infoText += ')';
            } else if (habit.type === 'slider' && habit.maxValue) {
                infoText += ` (MAX: ${habit.maxValue})`;
            } else if (habit.type === 'checkbox' && habit.tasks && habit.tasks.length > 0) {
                infoText += ` (${habit.tasks.length} TASK${habit.tasks.length > 1 ? 'S' : ''})`;
            }
            
            // Add weight information
            const weight = habit.weight || 1.0;
            if (weight !== 1.0) {
                infoText += ` | WEIGHT: ${weight}X`;
            }
            
            if (habit.days && habit.days.length > 0) {
                const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
                const selectedDays = habit.days.map(dayIndex => dayNames[dayIndex]);
                infoText += ` | DAYS: ${selectedDays.join(', ')}`;
            } else {
                infoText += ` | DAYS: NONE SELECTED`;
            }
            
            infoDiv.textContent = infoText;
            
            card.appendChild(header);
            card.appendChild(infoDiv);
            container.appendChild(card);
        });
    }
    
    // Open add habit modal
    openAddHabitModal() {
        try {
            // Reset color selection
            const colorInput = document.getElementById('habit-color');
            if (colorInput) colorInput.value = '';
            document.querySelectorAll('#habit-color-picker .color-box').forEach(b => b.classList.remove('selected'));
            
            document.getElementById('modal-title').textContent = 'ADD NEW HABIT';
            document.getElementById('habit-name').value = '';
            document.getElementById('habit-type').value = 'checkbox';
            document.getElementById('habit-weight').value = '1.0';
            document.getElementById('slider-options').style.display = 'none';
            document.getElementById('timer-goal-options').style.display = 'none';
            document.getElementById('timer-checkpoint').value = '';
            document.getElementById('checkbox-options').style.display = 'none';
            document.getElementById('task-list').innerHTML = '';
            document.getElementById('task-input').value = '';
        
        document.querySelectorAll('#days-selector input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.parentElement.classList.remove('checked');
        });
        
        this.editingHabitId = null;
        document.getElementById('habit-modal').style.display = 'block';
    } catch (error) {
        console.error('Failed to open add habit modal:', error);
    }
}
    
    // Add task to modal
    addTask() {
        const taskInput = document.getElementById('task-input');
        const taskName = taskInput.value.trim();
        
        if (!taskName) {
            alert('Please enter a task name.');
            return;
        }
        
        const taskList = document.getElementById('task-list');
        const taskId = this.generateId();
        const listItem = document.createElement('li');
        listItem.dataset.taskId = taskId;
        listItem.innerHTML = `
            <span class="task-name">${taskName}</span>
            <button class="delete-task-btn" onclick="habitTracker.removeTask('${taskId}')">X</button>
        `;
        taskList.appendChild(listItem);
        taskInput.value = '';
        taskInput.focus();
    }
    
    // Remove task from modal
    removeTask(taskId) {
        const listItem = document.querySelector(`#task-list li[data-task-id="${taskId}"]`);
        if (listItem) {
            listItem.remove();
        } else {
            console.warn(`Task item with ID ${taskId} not found for removal.`);
        }
    }
    
    // Toggle habit options based on type
    toggleHabitOptions() {
        const type = document.getElementById('habit-type').value;
        document.getElementById('slider-options').style.display =
            type === 'slider' ? 'block' : 'none';
        document.getElementById('timer-goal-options').style.display =
            type === 'timer' ? 'block' : 'none';
        document.getElementById('checkbox-options').style.display =
            type === 'checkbox' ? 'block' : 'none';
    }
    
    // Save habit (new or edited)
    saveHabit() {
        try {
            const name = document.getElementById('habit-name').value.trim();
            const type = document.getElementById('habit-type').value;
            const color = document.getElementById('habit-color')?.value || '';
            const weight = parseFloat(document.getElementById('habit-weight').value) || 1.0;
            const maxValue = type === 'slider' ?
                parseInt(document.getElementById('slider-max').value, 10) || 100 : null;
            let goalTime = null;
            
            if (type === 'timer') {
                const goalMinutes = parseInt(document.getElementById('timer-goal').value, 10) || 30;
                goalTime = goalMinutes * 60;
                
                // Handle checkpoint
                const checkpointMinutes = parseInt(document.getElementById('timer-checkpoint').value, 10);
                if (checkpointMinutes && checkpointMinutes > 0 && checkpointMinutes < goalMinutes) {
                    goalTime = goalMinutes * 60;
                    // Store checkpoint in seconds
                    var checkpointTime = checkpointMinutes * 60;
                } else {
                    var checkpointTime = null;
                }
            }
            
            let tasks = [];
            if (type === 'checkbox') {
                const taskItems = document.querySelectorAll('#task-list li');
                taskItems.forEach(item => {
                    const taskName = item.querySelector('.task-name').textContent.trim();
                    if (taskName) {
                        tasks.push({ name: taskName });
                    }
                });
            }
            
            const days = [];
            const dayCheckboxes = document.querySelectorAll('#days-selector input[type="checkbox"]');
            dayCheckboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                    days.push(parseInt(checkbox.value, 10));
                }
            });
            
            if (!name) {
                alert('Please enter a habit name');
                return;
            }
            
            if (type === 'timer' && (goalTime <= 0)) {
                alert('Please enter a valid goal time (greater than 0 minutes).');
                return;
            }
            
            if (this.editingHabitId) {
                const habit = this.habits.find(h => h.id === this.editingHabitId);
                if (habit) {
                    habit.name = name;
                    habit.type = type;
                    habit.maxValue = maxValue;
                    habit.days = days;
                    habit.color = color;
                    habit.weight = weight;
                    
                    if (type === 'timer') {
                        habit.goalTime = goalTime;
                        habit.checkpointTime = checkpointTime;
                    } else {
                        delete habit.goalTime;
                        delete habit.checkpointTime;
                    }
                    
                    if (type === 'checkbox') {
                        habit.tasks = tasks;
                    } else {
                        delete habit.tasks;
                    }
                }
            } else {
                const newHabit = {
                    id: this.generateId(),
                    name,
                    type,
                    maxValue,
                    days,
                    color,
                    weight,
                    ...(type === 'timer' && { goalTime, checkpointTime }),
                    ...(type === 'checkbox' && tasks.length > 0 && { tasks })
                };
                this.habits.push(newHabit);
            }
            
            this.saveData();
            
            // Recalculate streak since habit configuration may have changed
            console.log('Recalculating streak after habit save/edit');
            this.updateStreak();
            
            this.renderHabitsList();
            this.renderCalendar();
            this.renderTodayHabits();
            
            // Update statistics if we're on that tab
            const activeTab = document.querySelector('.tab-btn.active')?.textContent.toLowerCase();
            if (activeTab === 'statistics') {
                this.renderStatistics();
            }
            
            this.closeHabitModal();
        } catch (error) {
            console.error('Failed to save habit:', error);
            alert('Failed to save habit. Please try again.');
        }
    }
    
    // Edit existing habit
    editHabit(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) {
            console.error(`Habit ${habitId} not found for editing.`);
            return;
        }
        
        document.getElementById('modal-title').textContent = 'EDIT HABIT';
        document.getElementById('habit-name').value = habit.name;
        document.getElementById('habit-type').value = habit.type;
        document.getElementById('habit-weight').value = habit.weight || 1.0;
        document.getElementById('slider-options').style.display =
            habit.type === 'slider' ? 'block' : 'none';
        document.getElementById('timer-goal-options').style.display =
            habit.type === 'timer' ? 'block' : 'none';
        
        if (habit.type === 'slider' && habit.maxValue) {
            document.getElementById('slider-max').value = habit.maxValue;
        }
        
        if (habit.type === 'timer' && habit.goalTime) {
            const goalMinutes = Math.floor(habit.goalTime / 60);
            document.getElementById('timer-goal').value = goalMinutes;
            
            // Set checkpoint value if exists
            if (habit.checkpointTime) {
                const checkpointMinutes = Math.floor(habit.checkpointTime / 60);
                document.getElementById('timer-checkpoint').value = checkpointMinutes;
            } else {
                document.getElementById('timer-checkpoint').value = '';
            }
        } else if (habit.type === 'timer') {
            document.getElementById('timer-goal').value = 30;
            document.getElementById('timer-checkpoint').value = '';
        }
        
        document.getElementById('checkbox-options').style.display =
            habit.type === 'checkbox' ? 'block' : 'none';
        document.getElementById('task-list').innerHTML = '';
        
        if (habit.type === 'checkbox' && habit.tasks) {
            habit.tasks.forEach(task => {
                const taskId = this.generateId();
                const listItem = document.createElement('li');
                listItem.dataset.taskId = taskId;
                listItem.innerHTML = `
                    <span class="task-name">${task.name}</span>
                    <button class="delete-task-btn" onclick="habitTracker.removeTask('${taskId}')">X</button>
                `;
                document.getElementById('task-list').appendChild(listItem);
            });
        }
        
        document.getElementById('task-input').value = '';
        
        document.querySelectorAll('#days-selector input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.parentElement.classList.remove('checked');
        });
        
        if (habit.days && habit.days.length > 0) {
            habit.days.forEach(dayValue => {
                const checkbox = document.querySelector(`#days-selector input[value="${dayValue}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.parentElement.classList.add('checked');
                }
            });
        }
        
        // Set color selection
        const colorInput = document.getElementById('habit-color');
        if (colorInput) colorInput.value = habit.color || '';
        
        const pickerBoxes = document.querySelectorAll('#habit-color-picker .color-box');
        if (pickerBoxes && pickerBoxes.length > 0) {
            pickerBoxes.forEach(b => b.classList.toggle('selected', b.dataset.color === (habit.color || '')));
        }
        
        if (typeof initColorPicker === 'function') initColorPicker();
        
        this.editingHabitId = habitId;
        document.getElementById('habit-modal').style.display = 'block';
    }
    
    // Delete habit with custom confirmation
    async deleteHabit(habitId) {
        // Custom confirmation that always works
        const userConfirmed = await this.showCustomConfirmation(
            'DELETE HABIT', 
            'ARE YOU SURE YOU WANT TO DELETE THIS HABIT AND ALL ITS PROGRESS? THIS ACTION CANNOT BE UNDONE.',
            'DELETE',
            'CANCEL'
        );
        
        if (userConfirmed) {
            this.performHabitDeletion(habitId);
        }
    }
    
    // Show custom confirmation dialog
    showCustomConfirmation(title, message, confirmText, cancelText) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmation-modal');
            const titleElement = document.getElementById('confirmation-title');
            const messageElement = document.getElementById('confirmation-message');
            const confirmButton = document.getElementById('confirmation-confirm');
            const cancelButton = document.getElementById('confirmation-cancel');
            
            // Set content
            titleElement.textContent = title;
            messageElement.textContent = message;
            confirmButton.textContent = confirmText;
            cancelButton.textContent = cancelText;
            
            // Show modal
            modal.style.display = 'block';
            
            // Handle confirm
            const handleConfirm = () => {
                modal.style.display = 'none';
                confirmButton.removeEventListener('click', handleConfirm);
                cancelButton.removeEventListener('click', handleCancel);
                document.removeEventListener('keydown', handleKeydown);
                modal.removeEventListener('click', handleBackgroundClick);
                resolve(true);
            };
            
            // Handle cancel
            const handleCancel = () => {
                modal.style.display = 'none';
                confirmButton.removeEventListener('click', handleConfirm);
                cancelButton.removeEventListener('click', handleCancel);
                document.removeEventListener('keydown', handleKeydown);
                modal.removeEventListener('click', handleBackgroundClick);
                resolve(false);
            };
            
            // Handle keyboard events
            const handleKeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            };
            
            // Add event listeners
            confirmButton.addEventListener('click', handleConfirm);
            cancelButton.addEventListener('click', handleCancel);
            document.addEventListener('keydown', handleKeydown);
            
            // Close on background click
            const handleBackgroundClick = (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            };
            
            modal.addEventListener('click', handleBackgroundClick);
        });
    }
    
    // Perform the actual habit deletion
    performHabitDeletion(habitId) {
        console.log('Deleting habit:', habitId);
        
        this.habits = this.habits.filter(h => h.id !== habitId);
        
        Object.keys(this.progress).forEach(dateKey => {
            if (this.progress[dateKey][habitId]) {
                delete this.progress[dateKey][habitId];
            }
            
            if (this.progress[dateKey].lockedSnapshot && this.progress[dateKey].lockedSnapshot[habitId]) {
                delete this.progress[dateKey].lockedSnapshot[habitId];
            }
            
            // Clean up empty date entries
            const remainingKeys = Object.keys(this.progress[dateKey]).filter(key => key !== 'lockedSnapshot');
            const hasSnapshot = this.progress[dateKey].lockedSnapshot && Object.keys(this.progress[dateKey].lockedSnapshot).length > 0;
            
            if (remainingKeys.length === 0 && !hasSnapshot) {
                delete this.progress[dateKey];
            }
        });
        
        this.saveData();
        
        // Recalculate streak since habit composition changed
        console.log('Recalculating streak after habit deletion');
        this.updateStreak();
        
        this.renderHabitsList();
        this.renderTodayHabits();
        this.renderCalendar();
        
        // Update statistics if we're on that tab
        const activeTab = document.querySelector('.tab-btn.active')?.textContent.toLowerCase();
        if (activeTab === 'statistics') {
            this.renderStatistics();
        }
        
        console.log('Habit deleted successfully:', habitId);
    }
    
    // Statistics Methods
    
    // Get start of week (Sunday) for a given date
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
    
    // Get end of week (Saturday) for a given date
    getWeekEnd(date) {
        const weekStart = this.getWeekStart(date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return weekEnd;
    }
    
    // Calculate daily completion percentage with weights
    calculateDayCompletion(date) {
        const dateKey = this.getDateKey(date);
        const activeHabits = this.habits.filter(habit => 
            this.isHabitActiveOnDay(habit, date)
        );
        
        if (activeHabits.length === 0) return 0;
        
        let totalWeightedProgress = 0;
        let totalWeight = 0;
        
        activeHabits.forEach(habit => {
            const progress = this.getHabitProgress(habit.id, date);
            const weight = habit.weight || 1.0; // Default to 1.0 for existing habits without weight
            let progressPercent = 0;
            
            switch (habit.type) {
                case 'checkbox':
                    if (habit.tasks && habit.tasks.length > 0) {
                        const completedTasks = Array.isArray(progress) ? progress : [];
                        progressPercent = habit.tasks.length > 0 ? (completedTasks.length / habit.tasks.length) * 100 : 0;
                    } else {
                        progressPercent = progress === true ? 100 : 0;
                    }
                    break;
                case 'slider':
                    progressPercent = (progress / (habit.maxValue || 100)) * 100;
                    break;
                case 'timer':
                    if (habit.goalTime && habit.goalTime > 0) {
                        progressPercent = (progress / habit.goalTime) * 100;
                    } else {
                        progressPercent = 0;
                    }
                    progressPercent = Math.min(progressPercent, 100);
                    break;
            }
            
            totalWeightedProgress += (progressPercent * weight);
            totalWeight += weight;
        });
        
        return totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
    }
    
    // Calculate streak by scanning all available data from scratch
    calculateStreakFromScratch() {
        console.log('=== CALCULATING STREAK FROM SCRATCH ===');
        
        const today = new Date();
        const maxDaysToCheck = 365; // Check up to 1 year back
        let currentStreak = 0;
        let consecutiveDaysFound = 0;
        let countedZeroDay = false; // Track if we counted a zero day
        
        // Get all dates with data, sorted newest to oldest
        const datesWithData = [];
        
        // Start from today and go backwards
        for (let i = 0; i <= maxDaysToCheck; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            
            const dateKey = this.getDateKey(checkDate);
            const dayCompletion = this.calculateDayCompletion(checkDate);
            
            // Only include days that have active habits
            const activeHabits = this.habits.filter(habit => 
                this.isHabitActiveOnDay(habit, checkDate)
            );
            
            if (activeHabits.length > 0) {
                datesWithData.push({
                    date: new Date(checkDate),
                    dateKey: dateKey,
                    completion: dayCompletion,
                    isToday: i === 0
                });
            }
        }
        
        console.log('Dates with data found:', datesWithData.length);
        
        if (datesWithData.length === 0) {
            console.log('No dates with active habits found');
            return 0;
        }
        
        if (datesWithData.length === 1) {
            // Only one day of data
            const todayData = datesWithData[0];
            currentStreak = todayData.completion > 0 ? 1 : 0;
            console.log('Only one day of data, completion:', todayData.completion, 'streak:', currentStreak);
            return currentStreak;
        }
        
        // Check streak from today backwards
        let streakBroken = false;
        
        for (let i = 0; i < datesWithData.length - 1; i++) {
            const currentDay = datesWithData[i];
            const previousDay = datesWithData[i + 1];
            
            console.log(`Comparing ${currentDay.dateKey} (${currentDay.completion.toFixed(1)}%) vs ${previousDay.dateKey} (${previousDay.completion.toFixed(1)}%)`);
            
            if (i === 0) {
                // First day (today or most recent)
                if (currentDay.completion === 0) {
                    console.log('Most recent day has no progress - streak is 0');
                    streakBroken = true;
                    break;
                } else {
                    currentStreak = 1;
                    console.log('Most recent day has progress - streak starts at 1');
                }
            }
            
            // STOP CONDITIONS: Don't go further back if:
            // 1. Previous day has zero progress (count the zero but stop there)
            // 2. Previous day has higher progress than current day
            if (previousDay.completion === 0) {
                console.log(`Previous day ${previousDay.dateKey} has zero progress - counting it but stopping streak calculation here`);
                if (currentDay.completion >= previousDay.completion) {
                    currentStreak++; // Count the zero day
                    countedZeroDay = true; // Mark that we counted a zero
                    console.log(`Streak incremented to ${currentStreak} for matching/beating zero day, but stopping here`);
                }
                break;
            }
            
            if (previousDay.completion > currentDay.completion) {
                console.log(`Previous day ${previousDay.dateKey} has higher progress (${previousDay.completion.toFixed(1)}% vs ${currentDay.completion.toFixed(1)}%) - streak broken at ${currentStreak}`);
                break;
            }
            
            // Check if current day maintained or improved from previous day
            if (currentDay.completion >= previousDay.completion) {
                currentStreak++;
                console.log(`Day ${currentDay.dateKey} maintained/improved - streak now ${currentStreak}`);
            } else {
                console.log(`Day ${currentDay.dateKey} declined from ${previousDay.dateKey} - streak broken at ${currentStreak}`);
                break;
            }
        }
        
        // Adjust the display streak: subtract 1 if we counted a zero day, but never go below 0
        let displayStreak = currentStreak;
        if (countedZeroDay && currentStreak > 0) {
            displayStreak = currentStreak - 1;
            console.log(`Adjusted streak for zero day: ${currentStreak} -> ${displayStreak}`);
        }
        
        // Ensure we never show negative streaks
        displayStreak = Math.max(displayStreak, 0);
        
        console.log('Final calculated streak (internal):', currentStreak);
        console.log('Final display streak (adjusted):', displayStreak);
        return displayStreak;
    }
    
    // Update streak based on comprehensive recalculation (called on ANY data change)
    updateStreak() {
        console.log('=== STREAK UPDATE TRIGGERED ===');
        
        // Calculate streak from scratch every time
        const newStreak = this.calculateStreakFromScratch();
        
        // Update streak data
        this.streakData.currentStreak = newStreak;
        this.streakData.lastStreakDate = this.getDateKey(new Date());
        
        console.log('Streak updated to:', newStreak);
        console.log('=== STREAK UPDATE COMPLETE ===');
        
        this.saveData();
        
        // Immediately update UI
        this.updateStreakUI();
    }
    
    // Helper method to update streak UI immediately
    updateStreakUI() {
        const streakElement = document.getElementById('current-streak');
        console.log('Updating streak UI. Element found:', !!streakElement);
        console.log('Streak value to display:', this.streakData.currentStreak);
        
        if (streakElement) {
            streakElement.textContent = this.streakData.currentStreak;
            console.log('Streak UI updated to:', streakElement.textContent);
        } else {
            console.warn('Streak element not found in DOM');
            // Try to find it with a different method
            const altElement = document.querySelector('#current-streak');
            if (altElement) {
                altElement.textContent = this.streakData.currentStreak;
                console.log('Streak UI updated via querySelector');
            }
        }
        
        // Force a small delay and try again if element wasn't ready
        setTimeout(() => {
            const delayedElement = document.getElementById('current-streak');
            if (delayedElement && delayedElement.textContent !== this.streakData.currentStreak.toString()) {
                delayedElement.textContent = this.streakData.currentStreak;
                console.log('Streak UI updated with delay');
            }
        }, 100);
    }
    
    // Get week's data for chart
    getWeekData(weekStart) {
        const weekData = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(weekStart);
            currentDay.setDate(weekStart.getDate() + i);
            
            const completion = this.calculateDayCompletion(currentDay);
            weekData.push({
                day: dayNames[i],
                date: currentDay,
                completion: Math.round(completion)
            });
        }
        
        return weekData;
    }
    
    // Change statistics week
    changeStatsWeek(delta) {
        this.statsWeekStart.setDate(this.statsWeekStart.getDate() + (delta * 7));
        this.renderStatistics();
    }
    
    // Render statistics tab
    renderStatistics() {
        console.log('=== RENDERING STATISTICS ===');
        
        // Ensure streak data is properly initialized
        if (!this.streakData || typeof this.streakData.currentStreak === 'undefined') {
            console.log('Initializing streak data');
            this.streakData = { currentStreak: 0, lastStreakDate: null };
        }
        
        // Update streak calculation
        this.updateStreak();
        
        console.log('Current streak after update:', this.streakData.currentStreak);
        
        // Update week range display
        const weekEnd = this.getWeekEnd(this.statsWeekStart);
        const weekRangeElement = document.getElementById('stats-week-range');
        if (weekRangeElement) {
            weekRangeElement.textContent = `${this.statsWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        
        // FORCE update streak counter display
        this.updateStreakUI();
        
        console.log('Streak UI updated with value:', this.streakData.currentStreak);
        
        // Get week data and calculate stats
        const weekData = this.getWeekData(this.statsWeekStart);
        
        // Calculate week completion average
        const weekCompletion = weekData.reduce((sum, day) => sum + day.completion, 0) / weekData.length;
        const weekCompletionElement = document.getElementById('week-completion');
        if (weekCompletionElement) {
            weekCompletionElement.textContent = `${Math.round(weekCompletion)}%`;
        }
        
        // Find best day
        const bestDay = weekData.reduce((best, day) => day.completion > best.completion ? day : best, weekData[0]);
        const bestDayElement = document.getElementById('best-day');
        if (bestDayElement) {
            bestDayElement.textContent = bestDay.completion > 0 ? `${bestDay.day} (${bestDay.completion}%)` : '-';
        }
        
        // Render chart
        this.renderProgressChart(weekData);
        
        // Render habit breakdown
        this.renderHabitBreakdown();
        
        // Render compact calendar for statistics page
        this.renderStatsCalendar();
        
        console.log('=== STATISTICS RENDERING COMPLETE ===');
    }
    
    // Render enhanced progress chart with fading preview of past/future weeks
    renderProgressChart(weekData) {
        const canvas = document.getElementById('progress-chart');
        if (!canvas) return;
        
        // Check if the statistics tab is visible before any operations
        const statisticsTab = document.getElementById('statistics');
        if (!statisticsTab || !statisticsTab.classList.contains('active')) {
            // Store the data for later rendering when tab becomes visible
            this.pendingChartData = weekData;
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Get device pixel ratio for high DPI support
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Get container dimensions for responsive sizing
        const chartWrapper = canvas.closest('.chart-wrapper');
        let canvasWidth, canvasHeight;
        
        if (chartWrapper) {
            const wrapperRect = chartWrapper.getBoundingClientRect();
            // Use container dimensions if valid, otherwise use CSS-based defaults
            canvasWidth = wrapperRect.width > 0 ? wrapperRect.width : 700;
            canvasHeight = wrapperRect.height > 0 ? wrapperRect.height : 320;
        } else {
            // Fallback dimensions
            canvasWidth = 700;
            canvasHeight = 320;
        }
        
        // Ensure reasonable bounds for responsive design
        canvasWidth = Math.max(Math.min(canvasWidth, 1000), 400); // Between 400px and 1000px
        canvasHeight = Math.max(Math.min(canvasHeight, 400), 200);  // Between 200px and 400px
        
        // Set canvas dimensions
        canvas.width = canvasWidth * devicePixelRatio;
        canvas.height = canvasHeight * devicePixelRatio;
        
        // Set CSS size to match the container
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        // Scale the drawing context so everything draws at the correct size
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
        const width = canvasWidth;
        const height = canvasHeight;
        
        // Clear canvas with anti-aliasing
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Set high-quality text rendering
        ctx.textRenderingOptimization = 'optimizeQuality';
        
        // Get data for previous, current, and next weeks
        const prevWeekStart = new Date(this.statsWeekStart);
        prevWeekStart.setDate(this.statsWeekStart.getDate() - 7);
        const nextWeekStart = new Date(this.statsWeekStart);
        nextWeekStart.setDate(this.statsWeekStart.getDate() + 7);
        
        const prevWeekData = this.getWeekData(prevWeekStart);
        const currentWeekData = weekData;
        const nextWeekData = this.getWeekData(nextWeekStart);
        
        // Combine all weeks for extended view
        const allWeeksData = [...prevWeekData, ...currentWeekData, ...nextWeekData];
        
        // Enhanced chart dimensions for wider display
        const padding = 20; // Reduced from 40 since we removed Y-axis labels
        const bottomPadding = 70; // Extra space for labels
        const chartWidth = width - (padding * 2);
        const chartHeight = height - padding - bottomPadding;
        const totalBars = allWeeksData.length;
        const barWidth = chartWidth / (totalBars * 1.3); // Increased spacing from 1.1 to 1.3
        const barSpacing = barWidth * 0.3; // Increased spacing from 0.1 to 0.3
        const startX = padding + barSpacing;
        const startY = padding;
        
        // Create enhanced gradients
        const currentBarGradient = ctx.createLinearGradient(0, startY, 0, startY + chartHeight);
        currentBarGradient.addColorStop(0, '#4facfe');
        currentBarGradient.addColorStop(1, '#00f2fe');
        
        const fadeBarGradient = ctx.createLinearGradient(0, startY, 0, startY + chartHeight);
        fadeBarGradient.addColorStop(0, 'rgba(79, 172, 254, 0.4)');
        fadeBarGradient.addColorStop(1, 'rgba(0, 242, 254, 0.4)');
        
        const bgGradient = ctx.createLinearGradient(0, startY, 0, startY + chartHeight);
        bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
        
        const fadeBgGradient = ctx.createLinearGradient(0, startY, 0, startY + chartHeight);
        fadeBgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
        fadeBgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
        
        // Draw extended background grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 4]);
        
        for (let i = 0; i <= 5; i++) {
            const y = startY + (chartHeight * i / 5);
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(startX + chartWidth - barSpacing, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        // Draw week separator lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Line after previous week (before current week)
        const week1End = startX + (7 * (barWidth + barSpacing)) - barSpacing/2;
        ctx.beginPath();
        ctx.moveTo(week1End, startY);
        ctx.lineTo(week1End, startY + chartHeight);
        ctx.stroke();
        
        // Line after current week (before next week)
        const week2End = startX + (14 * (barWidth + barSpacing)) - barSpacing/2;
        ctx.beginPath();
        ctx.moveTo(week2End, startY);
        ctx.lineTo(week2End, startY + chartHeight);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // Draw all bars with fading effects
        allWeeksData.forEach((day, index) => {
            const barHeight = (day.completion / 100) * chartHeight;
            const x = startX + (index * (barWidth + barSpacing));
            const y = startY + chartHeight - barHeight;
            
            // Determine which week this bar belongs to and set opacity/blur
            const isCurrentWeek = index >= 7 && index < 14;
            const isPrevWeek = index < 7;
            const isNextWeek = index >= 14;
            
            // Set opacity and gradients based on week
            let bgFillStyle = bgGradient;
            let barFillStyle = currentBarGradient;
            let textOpacity = 1;
            
            if (isPrevWeek || isNextWeek) {
                bgFillStyle = fadeBgGradient;
                barFillStyle = fadeBarGradient;
                textOpacity = 0.5;
                
                // Apply blur effect for faded weeks
                ctx.filter = 'blur(1px)';
            } else {
                ctx.filter = 'none';
            }
            
            // Draw background bar with rounded corners
            ctx.fillStyle = bgFillStyle;
            this.drawRoundedRect(ctx, x, startY, barWidth, chartHeight, 3);
            ctx.fill();
            
            // Draw progress bar with rounded corners
            if (barHeight > 0) {
                ctx.fillStyle = barFillStyle;
                this.drawRoundedRect(ctx, x, y, barWidth, barHeight, 3);
                ctx.fill();
            }
            
            // Reset filter for text
            ctx.filter = 'none';
            
            // Draw day labels with appropriate opacity
            ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity * 0.9})`;
            ctx.font = `bold ${isCurrentWeek ? 9 : 8}px 'Segoe UI', sans-serif`; // Reduced from 11:10 to 9:8 for smaller text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(day.day, x + barWidth/2, startY + chartHeight + 10);
            
            // Draw percentage labels with shadow for current week only
            if (day.completion > 0 && isCurrentWeek) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.font = `bold ${8}px 'Segoe UI', sans-serif`; // Reduced from 10px to 8px for smaller text
                ctx.textBaseline = 'bottom';
                // Shadow text
                ctx.fillText(`${day.completion}%`, x + barWidth/2 + 1, y - 6 + 1);
                
                // Main text
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${day.completion}%`, x + barWidth/2, y - 6);
            }
        });
        
        // Draw week labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${7}px 'Segoe UI', sans-serif`; // Reduced from 9px to 7px for smaller text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Previous week label
        const prevWeekCenter = startX + (3.5 * (barWidth + barSpacing));
        ctx.fillText('PREVIOUS WEEK', prevWeekCenter, startY + chartHeight + 35);
        
        // Current week label
        const currentWeekCenter = startX + (10.5 * (barWidth + barSpacing));
        ctx.fillStyle = 'rgba(79, 172, 254, 0.9)';
        ctx.font = `bold ${8}px 'Segoe UI', sans-serif`; // Reduced from 10px to 8px for smaller text
        ctx.fillText('THIS WEEK', currentWeekCenter, startY + chartHeight + 35);
        
        // Next week label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${7}px 'Segoe UI', sans-serif`; // Reduced from 9px to 7px for smaller text
        const nextWeekCenter = startX + (17.5 * (barWidth + barSpacing));
        ctx.fillText('NEXT WEEK', nextWeekCenter, startY + chartHeight + 35);
    }
    
    // Helper function to draw rounded rectangles
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    // Render habit breakdown
    renderHabitBreakdown() {
        const container = document.getElementById('habit-stats-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.habits.length === 0) {
            container.innerHTML = '<p>NO HABITS TO ANALYZE.</p>';
            return;
        }
        
        // Calculate completion for each habit for the current week
        this.habits.forEach(habit => {
            const weekData = this.getWeekData(this.statsWeekStart);
            let totalCompletion = 0;
            let activeDays = 0;
            const weight = habit.weight || 1.0;
            
            weekData.forEach(day => {
                if (this.isHabitActiveOnDay(habit, day.date)) {
                    const progress = this.getHabitProgress(habit.id, day.date);
                    let completion = 0;
                    
                    switch (habit.type) {
                        case 'checkbox':
                            if (habit.tasks && habit.tasks.length > 0) {
                                const completedTasks = Array.isArray(progress) ? progress : [];
                                completion = habit.tasks.length > 0 ? (completedTasks.length / habit.tasks.length) * 100 : 0;
                            } else {
                                completion = progress === true ? 100 : 0;
                            }
                            break;
                        case 'slider':
                            completion = (progress / (habit.maxValue || 100)) * 100;
                            break;
                        case 'timer':
                            if (habit.goalTime && habit.goalTime > 0) {
                                completion = (progress / habit.goalTime) * 100;
                            }
                            completion = Math.min(completion, 100);
                            break;
                    }
                    
                    totalCompletion += completion;
                    activeDays++;
                }
            });
            
            const avgCompletion = activeDays > 0 ? totalCompletion / activeDays : 0;
            
            const habitItem = document.createElement('div');
            habitItem.className = 'habit-stat-item';
            habitItem.style.setProperty('--habit-color', habit.color || '#4facfe');
            
            // Display weight information if not default
            const weightInfo = weight !== 1.0 ? ` (${weight}x)` : '';
            
            habitItem.innerHTML = `
                <div class="habit-stat-name">${habit.name}${weightInfo}</div>
                <div class="habit-stat-progress">
                    <div class="habit-stat-bar">
                        <div class="habit-stat-fill" style="width: ${avgCompletion}%"></div>
                    </div>
                    <div class="habit-stat-percentage">${Math.round(avgCompletion)}%</div>
                </div>
                <div class="habit-controls">
                    <button class="control-btn edit-btn" onclick="habitTracker.editHabit('${habit.id}')">EDIT</button>
                    <button class="control-btn delete-btn" onclick="habitTracker.deleteHabit('${habit.id}')">DELETE</button>
                </div>
            `;
            
            container.appendChild(habitItem);
        });
    }
    
    // Close habit modal
    closeHabitModal() {
        document.getElementById('habit-modal').style.display = 'none';
        this.editingHabitId = null;
    }
}

// Initialize the habit tracker
const habitTracker = new HabitTracker();

// Color picker initialization
function initColorPicker() {
    const picker = document.getElementById('habit-color-picker');
    if (!picker) return;
    
    // Remove old listeners by replacing nodes
    picker.querySelectorAll('.color-box').forEach(box => {
        const newBox = box.cloneNode(true);
        box.parentNode.replaceChild(newBox, box);
    });
    
    // Attach click listeners
    picker.querySelectorAll('.color-box').forEach(box => {
        box.addEventListener('click', () => {
            picker.querySelectorAll('.color-box').forEach(b => b.classList.remove('selected'));
            box.classList.add('selected');
            const val = box.dataset.color || '';
            const colorInput = document.getElementById('habit-color');
            if (colorInput) colorInput.value = val;
        });
    });
}

// Run once
initColorPicker();

// Global tab switching function
function switchTab(tabName, clickedBtn) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the selected tab content
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    } else {
        console.error("Tab content not found:", tabName);
        return;
    }
    
    // Add active class to the clicked button
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    
    // Update the view based on the selected tab
    if (tabName === 'today') {
        habitTracker.updateCurrentDate();
        habitTracker.renderTodayHabits();
        habitTracker.renderCalendar();
    }
    else if (tabName === 'calendar') {
        habitTracker.updateCurrentDate();
        habitTracker.renderCalendar();
    }
    else if (tabName === 'habits') {
        habitTracker.renderHabitsList();
    }
    else if (tabName === 'statistics') {
        // Force refresh statistics with a delay to ensure DOM is ready and visible
        setTimeout(() => {
            habitTracker.renderStatistics();
            // If there's pending chart data, render it now that tab is visible
            if (habitTracker.pendingChartData) {
                habitTracker.renderProgressChart(habitTracker.pendingChartData);
                habitTracker.pendingChartData = null;
            }
        }, 100); // Increased delay to ensure proper DOM visibility
    }
}

// Global functions
function openAddHabitModal() { 
    habitTracker.openAddHabitModal(); 
}

function closeHabitModal() { 
    habitTracker.closeHabitModal(); 
}

function toggleHabitOptions() { 
    habitTracker.toggleHabitOptions(); 
}

// Add event listener for pressing Enter in the task input
document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    if (taskInput) {
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                habitTracker.addTask();
            }
        });
    }
});

// Sound effects for buttons removed for test version