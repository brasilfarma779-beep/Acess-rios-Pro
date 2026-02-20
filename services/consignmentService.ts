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
  items: { name: string; quantity: number }[],
  photosUrl: string,
  movementType: 'RETIRADA_ORIGINAL' | 'ADITIVO'
): WhatsAppPayload {
  
  const itemsList = items.map(i => `- ${i.quantity}x ${i.name}`).join('\n');
  const title = movementType === 'RETIRADA_ORIGINAL' ? '🎒 Nova Maleta Retirada!' : '➕ Novo Aditivo Adicionado!';

  const messageBody = `*HUB SOBERANO* 💎\n\n` +
    `Olá, *${sellerName}*! ${title}\n\n` +
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

// Exemplo de uso do Webhook
export async function triggerWhatsAppWebhook(payload: WhatsAppPayload) {
  // POST para a API oficial do WhatsApp (Cloud API) ou provedor
  /*
  await fetch('https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  */
  console.log('Webhook disparado para o WhatsApp:', payload);
}
