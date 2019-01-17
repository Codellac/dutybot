const telegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const User = require('./models/user');
const hours_12 = 43200000;
const PORT = process.env.PORT;
const mongoURL = process.env.mongoURL;
const TOKEN = process.env.TOKEN;
const options = { webHook: {port: PORT} };
const bot = new telegramBot(TOKEN, options);

//Connect to database
function connectDatabase() {

  mongoose.connect(mongoURL, { useNewUrlParser: true } );

  const db = mongoose.connection;

  db.on('error', err => {
    console.log('error', err);
  });
  db.once('open', () => {
    console.log('connected to database');
  });
  db.once('close', () => {
    console.log('disconnected to database');
  });
};


//Connect to database
function connectDatabase() {
 
  mongoose.connect(mongoURL);

  const db = mongoose.connection;

  db.on('error', err => {
  console.log('error', err);
  });
  db.once('open', () => {
  console.log('connected to database');
  });
  db.once('close', () => {
    console.log('disconnected to database');
  });
};
 

connectDatabase();


//Handler for command /start
bot.onText(/\/start/, (msg,match) => { 
  chat = msg.hasOwnProperty('chat') ? msg.chat.id : msg.from.id;
  bot.sendMessage(chat, 'Доступные команды для бота:\n/duty - Покажет кто сейчас дежурный.\n/duty 31.12.2018.23.59 - '+
  'С параметрами даты покажет кто дежурный на указанную дату и время.\nФормат даты DD.MM.YYYY.HH.MI.');        
});



bot.onText(/\/duty/, (msg) => {
  let msgChatId = msg.chat.id;
  let dateFromUser = new Date().getTime() + 18000000;
  
  if (msg.text == '/duty' || msg.text == '/duty@Duty_admin_bot') {
    updateDate(dateFromUser,true)
      .then(async(dutys) => {
      await bot.sendMessage(msgChatId, `Дежурный на дату: ${formatDate(new Date(dateFromUser))} ${dutys[1]}, смена ${dutys[2]}`);
      bot.sendContact(msgChatId, dutys[0], dutys[1]);
      });
  };
});


bot.onText(/\/duty (.+)/, (msg,match) => { 
  let msgChatId = msg.chat.id;
  let dateFromUser = match[1].split('.');
  let minDate = new Date(2018,0,01).getTime();
  let maxDate = new Date(2050,0,01).getTime();
  dateFromUser = new Date(dateFromUser[2], (dateFromUser[1] - 1), dateFromUser[0], dateFromUser[3] || 0, dateFromUser[4] || 0).getTime(); 
  
  if (dateFromUser > maxDate || isNaN(dateFromUser) || dateFromUser < minDate ) {
    bot.sendMessage(msgChatId, "Неверный формат или нарушен порог! Порог даты от 01.01.2018г. до 01.01.2050г.\nПопробуйте еще раз!");
  } else {
    updateDate(dateFromUser)
    .then(async(dutys) => {
      await bot.sendMessage(msgChatId, `Дежурный на дату: ${formatDate(new Date(dateFromUser))} ${dutys[1]}, смена ${dutys[2]}`);
      bot.sendContact(msgChatId, dutys[0], dutys[1]);
    });
  };      
});


//Function for update date and find duty admin
function updateDate(dateFromUser,update) {
  
  return new Promise(function (resolve, reject) {
    
    User.find({}, (err,data) => {
      if (err) throw err;
  
      for (var i = 0; i < data.length; i++) {
  
        while ((dateFromUser - data[i].date) > hours_12) {
       
            switch (data[i].status) {  
              case 'дневная': 
                data[i].date =  data[i].date + hours_12 * 3;  
                data[i].status = 'ночная';                      
              break;
  
              case 'ночная': 
                data[i].date =  data[i].date + hours_12 * 5;  
                data[i].status = 'дневная';                      
              break;        
            };
          if (update && (dateFromUser - data[i].date) < hours_12) {
            User.findByIdAndUpdate(
              data[i]._id, 
              {date: data[i].date, status: data[i].status}, 
              {new:true}, 
              (err,result) => {   
                if (err) throw err;    
                console.log(result);
              }
            );
          };
        };
        while (( data[i].date - dateFromUser) > hours_12) {
          
          switch (data[i].status) {  
            case 'дневная': 
              data[i].date =  data[i].date - hours_12 * 5;  
              data[i].status = 'ночная';                      
            break;

            case 'ночная': 
              data[i].date =  data[i].date - hours_12 * 3;  
              data[i].status = 'дневная';                      
            break;        
          };
        };
        if ((dateFromUser - data[i].date) < hours_12 && (dateFromUser - data[i].date) >= 0) {
          let dutys = [data[i].phone, data[i].name, data[i].status];
          resolve(dutys); 
        };
      };
    });
  });  
}; 


//Function for format date
function formatDate(date) {

  var dd = date.getDate();
  if (dd < 10) dd = '0' + dd;

  var mm = date.getMonth() + 1;
  if (mm < 10) mm = '0' + mm;

  var yy = date.getFullYear();

  var hh = date.getHours();
  if (hh < 10) hh = '0' + hh;

  var mins = date.getMinutes();
  if (mins < 10) mins = '0' + mins;

  return dd + '.' + mm + '.' + yy + ' время: ' + hh + ':' + mins;
};
