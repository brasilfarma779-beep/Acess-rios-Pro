
import { Movement, Representative, Product, MaletaSummary, Category, Sale, SaleStatus } from './types.ts';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const calculateCommissionRate = (totalSoldValue: number): number => {
  return totalSoldValue >= 5000 ? 0.50 : 0.30;
};

export const calculateMaletaSummaries = (movements: Movement[], reps: Representative[]): MaletaSummary[] => {
  return reps.map(rep => {
    const repMovements = movements.filter(m => m.representativeId === rep.id);
    
    let totalDeliveredValue = 0;
    let soldValue = 0;
    let commissionValueAdjustment = 0;
    let additionalValue = 0;
    
    let qtyDelivered = 0;
    let qtySold = 0;
    let qtyReturned = 0;

    repMovements.forEach(m => {
      const lineValue = m.value * m.quantity;
      
      if (m.type === 'Ajuste') {
        if (m.adjustmentTarget === 'sold') soldValue += lineValue;
        if (m.adjustmentTarget === 'commission') commissionValueAdjustment += lineValue;
        if (m.adjustmentTarget === 'total') totalDeliveredValue += lineValue;
        if (m.adjustmentTarget === 'additional') additionalValue += lineValue;
      } else {
        if (m.type === 'Entregue' || m.type === 'Reposição') {
          totalDeliveredValue += lineValue;
          qtyDelivered += m.quantity;
        } else if (m.type === 'Vendido') {
          soldValue += lineValue;
          qtySold += m.quantity;
        } else if (m.type === 'Devolvido') {
          qtyReturned += m.quantity;
        }
      }
    });

    const currentStockQty = qtyDelivered - qtySold - qtyReturned;
    const rate = calculateCommissionRate(soldValue);
    const finalCommission = (soldValue * rate) + commissionValueAdjustment;
    const ownerValue = soldValue - finalCommission;

    return {
      repId: rep.id,
      repName: rep.name,
      repPhone: rep.phone,
      totalDelivered: totalDeliveredValue,
      totalSold: qtySold,
      totalReturned: qtyReturned,
      currentStockQty,
      soldValue,
      commissionRate: rate * 100,
      commissionValue: finalCommission,
      ownerValue,
      additionalValue,
      isClosed: !rep.active,
      status: rep.status || 'Em Campo'
    };
  });
};

export const exportFullData = () => {
  const data = {
    reps: JSON.parse(localStorage.getItem('hub_v5_reps') || '[]'),
    prods: JSON.parse(localStorage.getItem('hub_v5_prods') || '[]'),
    movs: JSON.parse(localStorage.getItem('hub_v5_movs') || '[]'),
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_soberana_gestao_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
  a.click();
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
    reader.onerror = reject;
  });
};

export const validateProductImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = function (e) {
      img.src = e.target?.result as string;
    };

    img.onload = function () {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject("Erro ao processar imagem.");
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      let brilhoTotal = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        brilhoTotal += (r + g + b) / 3;
      }

      const brilhoMedio = brilhoTotal / (pixels.length / 4);

      // 🔎 Validação de brilho
      if (brilhoMedio < 60) {
        reject("Foto com pouca iluminação. Tire a foto com mais luz.");
        return;
      }

      // 📏 Validação de tamanho mínimo
      if (img.width < 600 || img.height < 600) {
        reject("Imagem com baixa resolução. Aproxime mais o produto.");
        return;
      }

      resolve("Imagem válida");
    };

    reader.readAsDataURL(file);
  });
};

export const resizeImage = (file: File, maxWidth = 1280, maxHeight = 1280): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};
