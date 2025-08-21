import Chat from '../components/chat/Chat';
import Modal from '../components/modal/Modal';
import ServerError from '../components/serverError/ServerError';
import Service from '../libs/Service';
import Spinner from '../components/spinner/Spinner';
import Users from '../components/users/Users';

export default class Controller {
  constructor(container) {
    if (!(container instanceof HTMLElement)) {
      throw new Error('This is not HTML element!');
    }

    this.container = container;
  }

  async init() {
    this.spinner = new Spinner(); 
    const server = await Service.pingServer(); 
    this.spinner.removeSpinner(); 

    // обработка ошибки подключения к серверу:
    if (server.status === 520) {
      this.serverError = new ServerError(server.status); 
      return;
    }

    this.renderModal();
  }

  renderModal() {
    this.modal = new Modal(); 
    this.modal.submitEvent(this.addModalSubmitEvent.bind(this));
  }

  async addModalSubmitEvent(event) {
    event.preventDefault();

    const name = this.modal.getInputValue();

    if (!name) {
      this.modal.showTooltip('Поле не должно быть пустым!'); // показать подсказку на 2 сек
      setTimeout(() => this.modal.hideTooltip(), 1000 * 2); // убрать подсказку
      return;
    }

    const data = await Service.registerUser(name); // попытка регистрации юзера на сервере

    
    if (data.error) {
      this.modal.removeForm(); // удалить модалку из DOM
      this.serverError = new ServerError(data.status); // отрисовать ошибку сервера
      return;
    }

    
    if (data.status === 'error') {
      this.modal.showTooltip('Это имя уже занято! Выберите другое!'); 
      setTimeout(() => this.modal.hideTooltip(), 1000 * 2); 
      return;
    }

    // ------------------- работа с юзером!!! ------------------
    
    if (data.status === 'ok') {
      this.currentId = data.user.id; // свой id
      this.currentName = data.user.name; // своё имя

      window.addEventListener('beforeunload', this.exit.bind(this)); 

      this.modal.removeForm(); 
      this.renderPage(); 
    }
  }

  exit() {
    const msg = {
      type: 'exit',
      user: { id: this.currentId, name: this.currentName },
    };

    this.ws.send(JSON.stringify(msg)); 
  }

  renderPage() {
    this.container.classList.remove('hidden'); 
    this.usersContainer = new Users(this.container); 
    this.chatContainer = new Chat(this.container); 

    this.chatContainer.addSubmitEvent(this.addChatSubmitEvent.bind(this)); // 'submit'

    this.connectToWebSocket(); // подключаем сокеты
  }

  connectToWebSocket() {
    // this.ws = new WebSocket('ws://localhost:7070/ws'); // локальный сервер
    this.ws = new WebSocket('wss://ahj-websockets-backend.onrender.com/ws'); // сервер на Render

   

    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);

      // отрисовка сообщений у всех юзеров:
      if (data.type === 'send') {
        const name = data.user.id === this.currentId ? 'You' : data.user.name;
        const info = `${name}, ${data.created}`;
        this.chatContainer.addMessage(info, data.msg, name === 'You'); 
        this.chatContainer.resetForm(); // очищаем форму
        return;
      }

      // обновление списка юзеров при входе/выходе каждого юзера:
      this.usersContainer.deleteUsers(); 

      data.forEach((user) => {
        const name = user.id === this.currentId ? 'You' : user.name;
        this.usersContainer.addUser(name); 
      });
    });

  }

  addChatSubmitEvent(event) {
    event.preventDefault();

    const message = this.chatContainer.getMessage();

    if (!message) {
      this.chatContainer.resetForm(); 
      return;
    }

    this.sendMsg(message);
  }

  sendMsg(message) {
    const date = new Date(Date.now()).toLocaleString('ru-Ru', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const formattedDate = date.split(', ').reverse().join(' ');

    const msg = {
      type: 'send',
      msg: message,
      user: {
        id: this.currentId,
        name: this.currentName,
      },
      created: formattedDate,
    };

    this.ws.send(JSON.stringify(msg)); 
  }
}
