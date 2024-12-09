const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

// Instância do cliente WhatsApp com autenticação persistente
const client = new Client({
    authStrategy: new LocalAuth(), // Salva o estado de autenticação localmente
});

// Função para enviar o QR Code para um número de WhatsApp
const sendQRCodeViaWhatsApp = async (qrCodeImage) => {
    const number = '258844577818@c.us'; // Substitua pelo seu número no formato correto
    const chat = await client.getChatById(number);
    
    // Envia o QR Code como imagem
    await chat.sendMessage(fs.readFileSync(qrCodeImage), {
        caption: 'Aqui está o QR Code para conectar-se ao WhatsApp.',
    });
    console.log('QR Code enviado para o WhatsApp!');
};

// Serviço de leitura do QR Code
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Escaneia o QR Code acima para conectar.');

    // Salva o QR Code como imagem
    const qrCodeImagePath = path.join(__dirname, 'qrcode.png');
    qrcode.toFile(qrCodeImagePath, qr, async (err) => {
        if (err) {
            console.error('Erro ao salvar o QR Code como imagem:', err);
            return;
        }
        console.log('QR Code salvo como imagem, enviando para o WhatsApp...');
        
        // Envia o QR Code por WhatsApp
        await sendQRCodeViaWhatsApp(qrCodeImagePath);
    });
});

// Indica que o cliente está pronto
client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

// Monitor de desconexão
client.on('disconnected', (reason) => {
    console.log(`WhatsApp desconectado! Motivo: ${reason}`);
    console.log('Tentando reconectar...');
    client.initialize(); // Reinicia o cliente
});

// Monitora o estado da conexão
client.on('change_state', state => {
    console.log('Estado da conexão:', state);
});

// Monitora falhas de autenticação
client.on('auth_failure', msg => {
    console.error('Falha na autenticação:', msg);
});

// Inicializa o cliente
client.initialize();

// Função para criar delays entre as ações
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Função para exibir o menu inicial
const showMenu = async (msg, chat) => {
    const contact = await msg.getContact();
    const name = contact.pushname.split(' ')[0] || 'Cliente';

    await chat.sendStateTyping();
    await delay(2000);
    await client.sendMessage(msg.from, 
        `Olá, ${name}! Sou o assistente virtual da Educare Digital Academy. Como posso ajudar-te hoje? \n` +
        `Digita uma das opções abaixo:\n\n` +
        `1 - Sobre a Educare Digital Academy\n2 - Cursos disponíveis\n3 - Benefícios dos cursos\n4 - Contato para dúvidas\n5 - Falar com um colaborador\n6 - Sair`
    );
};

// Configuração do funil de mensagens
client.on('message', async msg => {
    const chat = await msg.getChat();

    // Reconhece palavras-chave para iniciar o menu
    if (/menu|oi|olá|ola|bom|saudações|saudacoes/i.test(msg.body.toLowerCase()) && msg.from.endsWith('@c.us')) {
        await showMenu(msg, chat);
        return; // Garante que o menu só será chamado uma vez
    }

    // Respostas do menu
    const responses = {
        '1': `A EDUCARE Digital Academy é uma instituição educacional de ponta com sede em Moçambique, dedicada a fornecer educação digital e tecnológica de vanguarda. O nosso objetivo é capacitar estudantes e profissionais com habilidades e certificações relevantes para a indústria, preparando-os para se destacarem no cenário tecnológico global.\n\nDigita Menu para voltares à lista inicial de opções.`,
        '2': `Cursos disponíveis na Educare Digital Academy:\n- Essentials em Inteligência Artificial\n- Curso Executivo em Inteligência Artificial\n- CompTIA IT Fundamentals (ITF+)\n- CompTIA A+\n- CompTIA Network+\nE muitos outros!\n\nDigita Menu para voltares à lista inicial de opções.`,
        '3': `Benefícios dos nossos cursos:\n- Certificações Relevantes para a Indústria\n- Instrutores Experientes\n- Opções de Aprendizado Flexíveis\n- Suporte de Carreira\n\nTransforma o teu futuro com a Educare Digital Academy! \nDigita Menu para voltares à lista inicial de opções.`,
        '4': `Precisa de ajuda? Entre em contacto:\nEmail: digital@educare.co.mz\nTelefone: +258 84 313 3407\nTelefone: +258 86 527 6890\nVisite nosso site: https://educare.co.mz/digital-academy/ \n\nDigita Menu para voltares à lista inicial de opções.`,
        '5': `Obrigado por nos considerar! Um dos nossos colaboradores entrará em contacto brevemente. \n\nDigita Menu para voltares à lista inicial de opções.`,
        '6': `Obrigado por utilizar os nossos serviços. Se precisar de mais alguma coisa, estaremos aqui para ajudar. Até logo!`
    };

    // Processa a resposta com base no número digitado
    if (responses[msg.body] && msg.from.endsWith('@c.us')) {
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(msg.from, responses[msg.body]);

        // Finaliza a interação se a opção for "6"
        if (msg.body === '6') {
            return;
        }
    } else if (msg.body.toLowerCase() === 'menu' && msg.from.endsWith('@c.us')) {
        await showMenu(msg, chat); // Volta ao menu inicial
    }
});
