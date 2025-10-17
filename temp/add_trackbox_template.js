// Скрипт для добавления шаблона Trackbox в CRM
// Запуск: node add_trackbox_template.js

const template = {
  "code": "TRACKBOX_NIK",
  "name": "Trackbox NIK",
  "isActive": true,
  "method": "POST",
  "url": "https://sn.selection.website/api/signup/procform",
  "headers": {
    "x-trackbox-username": "NIK",
    "x-trackbox-password": "!+99Luj)ZB",
    "x-api-key": "2643889w34df345676ssdas323tgc738",
    "Content-Type": "application/json"
  },
  "body": "{\n  \"ai\": \"2958345\",\n  \"ci\": \"1\",\n  \"gi\": \"320\",\n  \"userip\": \"${ip}\",\n  \"firstname\": \"${firstName}\",\n  \"lastname\": \"${lastName}\",\n  \"email\": \"${email}\",\n  \"password\": \"${password}\",\n  \"phone\": \"${phone}\",\n  \"so\": \"${funnel}\",\n  \"sub\": \"${aff}\",\n  \"MPC_1\": \"${sub1}\",\n  \"MPC_2\": \"${sub2}\",\n  \"MPC_3\": \"${sub3}\",\n  \"MPC_4\": \"${sub4}\",\n  \"MPC_5\": \"${sub5}\",\n  \"MPC_6\": \"${sub6}\",\n  \"MPC_7\": \"${sub7}\",\n  \"MPC_8\": \"${sub8}\",\n  \"MPC_9\": \"${sub9}\",\n  \"MPC_10\": \"${sub10}\",\n  \"MPC_11\": \"${sub11}\",\n  \"MPC_12\": \"${sub12}\",\n  \"ad\": \"${utmSource}\",\n  \"term\": \"${utmTerm}\",\n  \"campaign\": \"${utmCampaign}\",\n  \"medium\": \"${utmMedium}\",\n  \"lg\": \"${lang}\"\n}"
};

async function addTemplate() {
  try {
    const response = await fetch('http://localhost:3001/v1/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Шаблон добавлен:', result);
    } else {
      console.error('❌ Ошибка:', await response.text());
    }
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
  }
}

addTemplate();
