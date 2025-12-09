// Toast notification system
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, duration);
}

// Confirmation modal
function showConfirmation(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.remove('hidden');
        
        const handleYes = () => {
            cleanup();
            resolve(true);
        };
        
        const handleNo = () => {
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
        };
        
        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', handleNo);
    });
}

// Prompt modal for text input
function showPrompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
        // Create modal elements if they don't exist
        let modal = document.getElementById('promptModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'promptModal';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3 id="promptTitle"></h3>
                    <p id="promptMessage"></p>
                    <input type="text" id="promptInput" class="input" />
                    <div class="modal-buttons">
                        <button id="promptOk" class="btn btn-primary">OK</button>
                        <button id="promptCancel" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        const titleEl = document.getElementById('promptTitle');
        const messageEl = document.getElementById('promptMessage');
        const inputEl = document.getElementById('promptInput');
        const okBtn = document.getElementById('promptOk');
        const cancelBtn = document.getElementById('promptCancel');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        inputEl.value = defaultValue;
        modal.classList.remove('hidden');
        
        // Focus input
        setTimeout(() => inputEl.focus(), 100);
        
        const handleOk = () => {
            const value = inputEl.value.trim();
            cleanup();
            resolve(value || null);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(null);
        };
        
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                handleOk();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        };
        
        const cleanup = () => {
            modal.classList.add('hidden');
            inputEl.removeEventListener('keydown', handleEnter);
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        
        inputEl.addEventListener('keydown', handleEnter);
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    });
}
