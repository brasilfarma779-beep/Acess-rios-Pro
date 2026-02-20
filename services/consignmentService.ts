export interface SaleItem {
  id: string;
  price: number;
  quantity: number;
}

export interface CycleCloseRequest {
  empresaId: string;
  cycleId: string;
  sellerId: string;
  soldItems: SaleItem[];
}

export interface CycleCloseResult {
  totalSales: number;
  commissionPercentage: number;
  commissionValue: number;
  netProfit: number;
}

/**
 * 1. Cálculo de Comissão com Trava Variável
 */
export function calculateCommission(totalSales: number): { percentage: number; value: number } {
  let percentage = 0.30; // 30% default

  if (totalSales >= 5000.00) {
    percentage = 0.40; // 40% se atingir a meta
  }

  const value = totalSales * percentage;

  return { percentage, value };
}

/**
 * 2. Fechamento do Ciclo e Atualização de Ranking
 * Simula a rota/função de backend para fechar o ciclo
 */
export async function closeConsignmentCycle(data: CycleCloseRequest): Promise<CycleCloseResult> {
  // 1. Somar o valor de todas as peças vendidas
  const totalSales = data.soldItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // 2. Calcular a comissão
  const { percentage, value: commissionValue } = calculateCommission(totalSales);
  const netProfit = totalSales - commissionValue;

  // 3. Atualizar Ranking e Dashboards (Simulação de persistência no BD)
  await updateRankingAndDashboard(data.empresaId, data.sellerId, totalSales, commissionValue);

  // 4. Atualizar status do ciclo para 'ACERTADO' no banco de dados
  // Exemplo: await db.collection('ciclos_consignacao').updateOne({ id: data.cycleId }, { status: 'ACERTADO' });

  return {
    totalSales,
    commissionPercentage: percentage * 100,
    commissionValue,
    netProfit
  };
}

async function updateRankingAndDashboard(empresaId: string, sellerId: string, salesVolume: number, commissionValue: number) {
  // Lógica de inserção no banco de dados (SQL ou NoSQL)
  /*
  await db.collection('ranking_vendedoras').updateOne(
    { empresa_id: empresaId, vendedora_id: sellerId },
    { 
      $inc: { volume_vendas_total: salesVolume, comissao_total: commissionValue },
      $set: { ultima_atualizacao: new Date() }
    },
    { upsert: true }
  );
  */
  console.log(`Ranking atualizado para vendedora ${sellerId}: Vendas +${salesVolume}, Comissão +${commissionValue}`);
}

/**
 * 3. Gatilho de WhatsApp (Payload de Integração)
 */
export interface WhatsAppPayload {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: {
    body: string;
  };
}

export function generateWhatsAppPayload(
  sellerPhone: string,
  sellerName: string,
  dueDate: string,
  items: { name: string; quantity: number; price: number }[],
  photosUrl: string,
  movementType: 'RETIRADA_ORIGINAL' | 'ADITIVO'
): WhatsAppPayload {
  
  const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const itemsList = items.map(i => `- ${i.quantity}x ${i.name} (${formatCurrency(i.price)})`).join('\n');
  const title = movementType === 'RETIRADA_ORIGINAL' ? '🎒 Nova Maleta Retirada!' : '➕ Novo Aditivo Adicionado!';

  const messageBody = `*HUB SOBERANO* 💎\n\n` +
    `Olá, *${sellerName}*! ${title}\n\n` +
    `💰 *Valor Total desta Remessa:* ${formatCurrency(totalValue)}\n` +
    `📅 *Data Limite para Acerto:* ${new Date(dueDate).toLocaleDateString('pt-BR')}\n\n` +
    `📦 *Itens Levados:*\n${itemsList}\n\n` +
    `📸 *Fotos das Peças:* ${photosUrl}\n\n` +
    `🚀 *Lembrete de Metas:*\n` +
    `• Até R$ 4.999,99 em vendas ➡️ *30% de Comissão*\n` +
    `• Acima de R$ 5.000,00 em vendas ➡️ *40% de Comissão*\n\n` +
    `Boas vendas e vamos bater essa meta! 💪✨`;

  return {
    messaging_product: "whatsapp",
    to: sellerPhone,
    type: "text",
    text: {
      body: messageBody
    }
  };
}

// Função que realiza o POST para a API do WhatsApp
export async function triggerWhatsAppWebhook(payload: WhatsAppPayload) {
  // Exemplo de integração com a Cloud API do WhatsApp
  /*
  const response = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
  }
  */
  
  // Log para ambiente de desenvolvimento/demonstração
  console.log('--- WHATSAPP WEBHOOK TRIGGERED ---');
  console.log('To:', payload.to);
  console.log('Message:', payload.text.body);
  console.log('----------------------------------');
}

/**
 * Função de Gatilho Imediato
 * Deve ser chamada logo após salvar o movimento no banco de dados
 */
export async function onMovementRegistered(params: {
  sellerPhone: string;
  sellerName: string;
  dueDate: string;
  items: { name: string; quantity: number; price: number }[];
  photosUrl: string;
  movementType: 'RETIRADA_ORIGINAL' | 'ADITIVO';
}) {
  try {
    console.log(`[WhatsApp Trigger] Iniciando disparo para ${params.sellerName}...`);
    
    const payload = generateWhatsAppPayload(
      params.sellerPhone,
      params.sellerName,
      params.dueDate,
      params.items,
      params.photosUrl,
      params.movementType
    );

    await triggerWhatsAppWebhook(payload);
    
    console.log(`[WhatsApp Trigger] Mensagem enviada com sucesso para ${params.sellerName}`);
  } catch (error) {
    console.error(`[WhatsApp Trigger] Erro ao enviar mensagem para ${params.sellerName}:`, error);
    // Aqui poderíamos implementar uma fila de retry ou logar em um serviço de monitoramento
  }
}

export interface ExpeditionRequest {
  sellerName: string;
  sellerPhone: string;
  items: { name: string; quantity: number; price: number }[];
  totalValue: number;
  photoUrl: string;
}

/**
 * 4. Expedição de Maleta e Recibo via WhatsApp
 */
export async function processSuitcaseExpedition(data: ExpeditionRequest) {
  // 1. Calcular data de devolução (60 dias)
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 60);
  const dueDateFormatted = dueDate.toLocaleDateString('pt-BR');

  // 2. Formatar lista de itens para o WhatsApp
  const itemsList = data.items
    .map(item => `• ${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}`)
    .join('\n');

  // 3. Montar o template de texto
  const messageBody = `Olá, *${data.sellerName}*! 💎\n` +
    `Sua maleta de semijoias foi registrada e liberada com sucesso.\n\n` +
    `📸 *Foto de conferência da sua maleta:*\n${data.photoUrl}\n\n` +
    `📦 *Resumo dos itens na sua maleta:*\n${itemsList}\n\n` +
    `💵 *Total em mercadorias:* ${formatCurrency(data.totalValue)}\n` +
    `🗓️ *Data limite para devolução e acerto:* ${dueDateFormatted}\n\n` +
    `💰 *Lembrete das suas Metas de Comissão:*\n` +
    `- Vendas até R$ 4.999,99 = *30% de lucro*.\n` +
    `- Vendas a partir de R$ 5.000,00 = *40% de lucro*!\n\n` +
    `Desejamos excelentes vendas! Qualquer dúvida, estamos à disposição.`;

  // 4. Disparar para a API do WhatsApp
  const payload: WhatsAppPayload = {
    messaging_product: "whatsapp",
    to: data.sellerPhone,
    type: "text",
    text: {
      body: messageBody
    }
  };

  await triggerWhatsAppWebhook(payload);

  return {
    success: true,
    dueDate: dueDate.toISOString(),
    messageSent: true
  };
}

// Auxiliar para formatar moeda no backend (simples)
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
