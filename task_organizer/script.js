document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyButton = document.getElementById('save-api-key');
    const userInput = document.getElementById('user-input');
    const sendMessageButton = document.getElementById('send-message');
    const chatContainer = document.getElementById('chat-container');
    const tasksContainer = document.getElementById('tasks-container');
    const addTaskButton = document.getElementById('add-task-button');
    const taskForm = document.getElementById('task-form');
    const saveTaskButton = document.getElementById('save-task');

    let apiKey = localStorage.getItem('claudeApiKey');
    let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let editingTaskId = null;

    if (apiKey) {
        apiKeyInput.value = apiKey;
    }

    saveApiKeyButton.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        localStorage.setItem('claudeApiKey', apiKey);
        alert('Clave API guardada con éxito');
    });

    sendMessageButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    addTaskButton.addEventListener('click', () => {
        editingTaskId = null;
        taskForm.classList.remove('hidden');
        document.getElementById('task-title').value = '';
        document.getElementById('task-date').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-priority').value = 'media';
        document.getElementById('task-status').value = 'pendiente';
    });

    saveTaskButton.addEventListener('click', saveTask);

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message) {
            addMessageToChat('user', message);
            userInput.value = '';
            await askClaude(message);
        }
    }

    function addMessageToChat(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.className = `mb-2 p-2 rounded-lg ${sender === 'user' ? 'bg-blue-100 text-right' : 'bg-gray-100'}`;
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        if (sender !== 'system') {
            conversationHistory.push({ role: sender, content: message });
            localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
        }
    }

    async function askClaude(question) {
        if (!apiKey) {
            addMessageToChat('system', 'Por favor, ingresa tu clave API de Claude primero.');
            return;
        }

        addMessageToChat('system', 'Claude está pensando...');

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: "claude-2",
                    messages: [
                        { role: "system", content: `Eres un asistente para organizar tareas. Aquí están las tareas actuales del usuario: ${JSON.stringify(tasks)}. Usa esta información para ayudar al usuario a organizar, priorizar y gestionar sus tareas.` },
                        ...conversationHistory,
                        { role: "human", content: question }
                    ],
                    max_tokens: 1000
                }),
            });

            if (!response.ok) {
                throw new Error('Error en la respuesta de la API');
            }

            const data = await response.json();
            const claudeResponse = data.content[0].text;
            addMessageToChat('assistant', claudeResponse);

            // Procesar la respuesta de Claude para actualizar tareas si es necesario
            processClaudeResponse(claudeResponse);
        } catch (error) {
            console.error('Error al comunicarse con Claude:', error);
            addMessageToChat('system', 'Lo siento, hubo un error al comunicarse con Claude. Por favor, verifica tu clave API e intenta de nuevo.');
        }
    }

    function processClaudeResponse(response) {
        // Aquí puedes implementar lógica para que Claude modifique tareas
        // Por ejemplo, buscar patrones en la respuesta que indiquen cambios en las tareas
        // y actualizar las tareas en consecuencia
    }

    function saveTask() {
        const title = document.getElementById('task-title').value.trim();
        const date = document.getElementById('task-date').value;
        const description = document.getElementById('task-description').value.trim();
        const priority = document.getElementById('task-priority').value;
        const status = document.getElementById('task-status').value;

        if (title) {
            if (editingTaskId !== null) {
                // Editar tarea existente
                const taskIndex = tasks.findIndex(task => task.id === editingTaskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex] = { ...tasks[taskIndex], title, date, description, priority, status };
                }
            } else {
                // Agregar nueva tarea
                const newTask = {
                    id: Date.now(),
                    title,
                    date,
                    description,
                    priority,
                    status
                };
                tasks.push(newTask);
            }

            localStorage.setItem('tasks', JSON.stringify(tasks));
            renderTasks();
            taskForm.classList.add('hidden');
            editingTaskId = null;
        }
    }

    function renderTasks() {
        tasksContainer.innerHTML = '';
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'mb-2 p-2 bg-white rounded-lg shadow';
            taskElement.innerHTML = `
                <h3 class="font-bold">${task.title}</h3>
                <p>Fecha: ${task.date || 'No especificada'}</p>
                <p>Descripción: ${task.description}</p>
                <p>Prioridad: ${task.priority}</p>
                <p>Estado: ${task.status}</p>
                <button class="edit-task bg-yellow-500 text-white px-2 py-1 rounded-md mr-2" data-id="${task.id}">Editar</button>
                <button class="delete-task bg-red-500 text-white px-2 py-1 rounded-md" data-id="${task.id}">Eliminar</button>
            `;
            tasksContainer.appendChild(taskElement);
        });

        // Agregar event listeners para editar y eliminar tareas
        document.querySelectorAll('.edit-task').forEach(button => {
            button.addEventListener('click', (e) => editTask(e.target.getAttribute('data-id')));
        });
        document.querySelectorAll('.delete-task').forEach(button => {
            button.addEventListener('click', (e) => deleteTask(e.target.getAttribute('data-id')));
        });
    }

    function editTask(taskId) {
        const task = tasks.find(t => t.id === parseInt(taskId));
        if (task) {
            editingTaskId = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-date').value = task.date || '';
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority || 'media';
            document.getElementById('task-status').value = task.status || 'pendiente';
            taskForm.classList.remove('hidden');
        }
    }

    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== parseInt(taskId));
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
    }

    // Inicialización
    renderTasks();
    conversationHistory.forEach(message => {
        addMessageToChat(message.role, message.content);
    });
});