import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Admin user
  const adminNavPass = await bcrypt.hash('Adminuz4duy!89', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@labolab.com.ec' },
    update: { password: adminNavPass, name: 'Admin', role: 'ADMIN', active: true },
    create: {
      email: 'admin@labolab.com.ec',
      password: adminNavPass,
      name: 'Admin',
      role: 'ADMIN',
      active: true,
    },
  });
  console.log('✅ Navigable admin user created');

  // 2. Additional demo users
  const secretariaPass = await bcrypt.hash('Labolab2024!', 10);
  await prisma.user.upsert({
    where: { email: 'secretaria@labolab.com.ec' },
    update: {},
    create: {
      email: 'secretaria@labolab.com.ec',
      password: secretariaPass,
      name: 'Rubí Martínez',
      role: 'SECRETARIA',
      active: true,
    },
  });

  const analistaFQPass = await bcrypt.hash('Labolab2024!', 10);
  await prisma.user.upsert({
    where: { email: 'analista.fq@labolab.com.ec' },
    update: {},
    create: {
      email: 'analista.fq@labolab.com.ec',
      password: analistaFQPass,
      name: 'Carlos López',
      role: 'ANALISTA_FQ',
      active: true,
    },
  });

  const analistaMicaPass = await bcrypt.hash('Labolab2024!', 10);
  await prisma.user.upsert({
    where: { email: 'analista.mica@labolab.com.ec' },
    update: {},
    create: {
      email: 'analista.mica@labolab.com.ec',
      password: analistaMicaPass,
      name: 'Andrea Sánchez',
      role: 'ANALISTA_MICA',
      active: true,
    },
  });
  // 2b. Client portal user (self-service)
  const clientePass = await bcrypt.hash('Cliente2024!', 10);
  const clienteUser = await prisma.user.upsert({
    where: { email: 'cliente@labolab.com.ec' },
    update: { password: clientePass },
    create: {
      email: 'cliente@labolab.com.ec',
      password: clientePass,
      name: 'Empresa Ejemplo S.A.',
      role: 'CLIENTE',
      active: true,
    },
  });
  console.log('✅ Demo users created');

  // 3. Sample types
  const sampleTypes = [
    { name: 'Alimentos procesados', description: 'Alimentos procesados para consumo humano' },
    { name: 'Aguas', description: 'Muestras de agua potable, residual, etc.' },
    { name: 'Bebidas', description: 'Bebidas alcohólicas y no alcohólicas' },
    { name: 'Lácteos', description: 'Leche y derivados lácteos' },
    { name: 'Cárnicos', description: 'Carnes y productos cárnicos' },
    { name: 'Cereales y granos', description: 'Cereales, granos y derivados' },
    { name: 'Frutas y vegetales', description: 'Frutas, hortalizas y derivados' },
    { name: 'Harinas', description: 'Harinas de trigo, maíz y otros cereales' },
    { name: 'Conservas', description: 'Alimentos en conserva' },
    { name: 'Suplementos alimenticios', description: 'Suplementos y complementos alimenticios' },
  ];

  for (const st of sampleTypes) {
    await prisma.sampleType.upsert({
      where: { name: st.name },
      update: {},
      create: st,
    });
  }
  console.log('✅ Sample types created');

  // 4. Analysis types - Fisicoquímica
  const fqAnalyses = [
    { code: 'FQ-HUM', name: 'Humedad', method: 'NTE INEN-ISO 6496 / AOAC 925.10', unit: '%', basePrice: 15.00, estimatedDays: 3, detectionLimit: '0,1 %', minValue: 0, maxValue: 90 },
    { code: 'FQ-PRO', name: 'Proteína', method: 'NTE INEN-ISO 8968-1 / AOAC 920.87 (Kjeldahl)', unit: '%', basePrice: 25.00, estimatedDays: 3, detectionLimit: '0,1 %', minValue: 1, maxValue: 25 },
    { code: 'FQ-GRA', name: 'Grasa', method: 'NTE INEN-ISO 8262 / AOAC 920.85 (Soxhlet)', unit: '%', basePrice: 20.00, estimatedDays: 3, detectionLimit: '0,1 %', minValue: 0.1, maxValue: 30 },
    { code: 'FQ-FIB', name: 'Fibra cruda', method: 'AOAC 962.09', unit: '%', basePrice: 20.00, estimatedDays: 3, detectionLimit: '0,1 %', minValue: 0, maxValue: 50 },
    { code: 'FQ-CEN', name: 'Cenizas', method: 'NTE INEN 14 / AOAC 923.03', unit: '%', basePrice: 15.00, estimatedDays: 3, detectionLimit: '0,05 %', minValue: 0.5, maxValue: 0.9 },
    { code: 'FQ-PH', name: 'pH', method: 'AOAC 981.12', unit: 'Unidades pH', basePrice: 8.00, estimatedDays: 1, minValue: 6.5, maxValue: 8.5 },
    { code: 'FQ-ACI', name: 'Acidez titulable (ácido láctico)', method: 'NTE INEN 13 / AOAC 942.15', unit: '%', basePrice: 10.00, estimatedDays: 1, detectionLimit: '0,01 %', minValue: 0.13, maxValue: 1.62 },
    { code: 'FQ-CAR', name: 'Carbohidratos totales', method: 'Cálculo por diferencia', unit: '%', basePrice: 8.00, estimatedDays: 1 },
    { code: 'FQ-BRI', name: 'Grados Brix', method: 'AOAC 932.12', unit: '°Bx', basePrice: 8.00, estimatedDays: 1, minValue: 0, maxValue: 85 },
    { code: 'FQ-SAL', name: 'Cloruro de sodio (Sal)', method: 'AOAC 937.09 (Mohr)', unit: '%', basePrice: 12.00, estimatedDays: 2, minValue: 0, maxValue: 100 },
    { code: 'FQ-HIE', name: 'Hierro', method: 'AOAC 944.02', unit: 'mg/kg', basePrice: 30.00, estimatedDays: 5 },
    { code: 'FQ-CAL', name: 'Calcio', method: 'AOAC 944.03', unit: 'mg/kg', basePrice: 30.00, estimatedDays: 5 },
    { code: 'FQ-VIT', name: 'Vitamina C', method: 'AOAC 967.21', unit: 'mg/100g', basePrice: 25.00, estimatedDays: 3 },
    { code: 'FQ-PER', name: 'Índice de peróxidos', method: 'AOAC 965.33', unit: 'meq O2/kg', basePrice: 15.00, estimatedDays: 2, maxValue: 10 },
    { code: 'FQ-DEN', name: 'Densidad', method: 'NTE INEN 11', unit: 'g/mL', basePrice: 8.00, estimatedDays: 1, minValue: 1.028, maxValue: 1.034 },
    { code: 'FQ-SOL', name: 'Sólidos totales', method: 'NTE INEN 14', unit: '%', basePrice: 15.00, estimatedDays: 3, detectionLimit: '0,1 %', minValue: 8.3, maxValue: 15.3 },
  ];

  for (const a of fqAnalyses) {
    await prisma.analysisType.upsert({
      where: { code: a.code },
      update: {
        name: a.name, method: a.method, unit: a.unit, basePrice: a.basePrice,
        estimatedDays: a.estimatedDays, detectionLimit: (a as any).detectionLimit ?? null,
        minValue: (a as any).minValue ?? null, maxValue: (a as any).maxValue ?? null,
      },
      create: {
        ...a,
        area: 'FISICOQUIMICA',
      },
    });
  }
  console.log('✅ Fisicoquímica analysis types created');

  // 5. Analysis types - Microbiología
  const micaAnalyses = [
    { code: 'MI-SAL', name: 'Salmonella spp.', method: 'AOAC 2014.01 (Método rápido)', unit: 'Presencia/Ausencia en 25g', basePrice: 35.00, estimatedDays: 5 },
    { code: 'MI-ECO', name: 'Escherichia coli', method: 'AOAC 991.14 (Petrifilm)', unit: 'UFC/g', basePrice: 20.00, estimatedDays: 3, detectionLimit: '< 10 UFC/g', maxValue: 10 },
    { code: 'MI-COL', name: 'Coliformes totales', method: 'AOAC 991.14 (Petrifilm)', unit: 'UFC/g', basePrice: 18.00, estimatedDays: 3, detectionLimit: '< 10 UFC/g', maxValue: 100 },
    { code: 'MI-MOH', name: 'Mohos y levaduras', method: 'AOAC 997.02 (Petrifilm)', unit: 'UFC/g', basePrice: 18.00, estimatedDays: 5, detectionLimit: '< 10 UFC/g', maxValue: 1000 },
    { code: 'MI-AER', name: 'Aerobios mesófilos', method: 'AOAC 990.12 (Petrifilm)', unit: 'UFC/g', basePrice: 18.00, estimatedDays: 3, detectionLimit: '< 10 UFC/g', maxValue: 100000 },
    { code: 'MI-STA', name: 'Staphylococcus aureus', method: 'AOAC 2003.11 (Petrifilm)', unit: 'UFC/g', basePrice: 22.00, estimatedDays: 3, detectionLimit: '< 10 UFC/g', maxValue: 100 },
    { code: 'MI-LIS', name: 'Listeria monocytogenes', method: 'AOAC 2004.02', unit: 'Presencia/Ausencia en 25g', basePrice: 40.00, estimatedDays: 5 },
    { code: 'MI-CLP', name: 'Clostridium perfringens', method: 'ISO 7937', unit: 'UFC/g', basePrice: 25.00, estimatedDays: 5, detectionLimit: '< 10 UFC/g', maxValue: 100 },
  ];

  for (const a of micaAnalyses) {
    await prisma.analysisType.upsert({
      where: { code: a.code },
      update: {
        name: a.name, method: a.method, unit: a.unit, basePrice: a.basePrice,
        estimatedDays: a.estimatedDays, detectionLimit: (a as any).detectionLimit ?? null,
        minValue: (a as any).minValue ?? null, maxValue: (a as any).maxValue ?? null,
      },
      create: {
        ...a,
        area: 'MICROBIOLOGIA',
      },
    });
  }
  console.log('✅ Microbiología analysis types created');

  // 6. Analysis groups (paquetes comunes)
  const fqTypes = await prisma.analysisType.findMany({ where: { area: 'FISICOQUIMICA' } });
  const micaTypes = await prisma.analysisType.findMany({ where: { area: 'MICROBIOLOGIA' } });

  // Grupo: Análisis proximal
  const proximalGroup = await prisma.analysisGroup.upsert({
    where: { code: 'GRP-PROX' },
    update: {},
    create: {
      code: 'GRP-PROX',
      name: 'Análisis Proximal Completo',
      description: 'Humedad, Proteína, Grasa, Fibra, Cenizas, Carbohidratos',
    },
  });

  const proximalCodes = ['FQ-HUM', 'FQ-PRO', 'FQ-GRA', 'FQ-FIB', 'FQ-CEN', 'FQ-CAR'];
  for (const code of proximalCodes) {
    const at = fqTypes.find((t: any) => t.code === code);
    if (at) {
      await prisma.analysisGroupItem.upsert({
        where: { groupId_analysisTypeId: { groupId: proximalGroup.id, analysisTypeId: at.id } },
        update: {},
        create: { groupId: proximalGroup.id, analysisTypeId: at.id },
      });
    }
  }

  // Grupo: Microbiológico básico
  const micaBasicGroup = await prisma.analysisGroup.upsert({
    where: { code: 'GRP-MICA-BAS' },
    update: {},
    create: {
      code: 'GRP-MICA-BAS',
      name: 'Microbiológico Básico',
      description: 'E.coli, Coliformes, Mohos y levaduras, Aerobios mesófilos',
    },
  });

  const micaBasicCodes = ['MI-ECO', 'MI-COL', 'MI-MOH', 'MI-AER'];
  for (const code of micaBasicCodes) {
    const at = micaTypes.find((t: any) => t.code === code);
    if (at) {
      await prisma.analysisGroupItem.upsert({
        where: { groupId_analysisTypeId: { groupId: micaBasicGroup.id, analysisTypeId: at.id } },
        update: {},
        create: { groupId: micaBasicGroup.id, analysisTypeId: at.id },
      });
    }
  }
  console.log('✅ Analysis groups created');

  // 7. Demo client
  await prisma.client.upsert({
    where: { ruc: '1790000000001' },
    update: { userId: clienteUser.id },
    create: {
      name: 'Empresa Ejemplo S.A.',
      ruc: '1790000000001',
      email: 'info@empresaejemplo.com',
      phone: '02-2345678',
      address: 'Av. Amazonas N36-152 y Naciones Unidas',
      city: 'Quito',
      clientType: 'EMPRESA',
      contactName: 'María García',
      contactPhone: '0991234567',
      contactEmail: 'mgarcia@empresaejemplo.com',
      userId: clienteUser.id,
    },
  });

  await prisma.client.upsert({
    where: { ruc: '0102345678001' },
    update: {},
    create: {
      name: 'Industrias Alimenticias del Sur',
      ruc: '0102345678001',
      email: 'calidad@indalsur.com',
      phone: '07-2837465',
      address: 'Parque Industrial Cuenca',
      city: 'Cuenca',
      clientType: 'EMPRESA',
      contactName: 'Roberto Andrade',
      contactPhone: '0987654321',
    },
  });
  console.log('✅ Demo clients created');

  // 8. System config
  const configs = [
    { key: 'lab_name', value: 'LABOLAB', label: 'Nombre del laboratorio', category: 'LAB' },
    { key: 'lab_full_name', value: 'LABOLAB - Laboratorio de Análisis de Alimentos', label: 'Nombre completo', category: 'LAB' },
    { key: 'lab_ruc', value: '1792XXXXXXX001', label: 'RUC del laboratorio', category: 'LAB' },
    { key: 'lab_address', value: 'Francisco Andrade Marín E7-29 y Diego de Almagro, Quito - Ecuador', label: 'Dirección del laboratorio', category: 'LAB' },
    { key: 'lab_phone', value: 'Telfs. 2563 225 / 2561 350 / 3238 503 / 3238 504 / Cel.: 0999 590 412', label: 'Teléfono', category: 'LAB' },
    { key: 'lab_email', value: 'informes@labolab.com.ec', label: 'Email del laboratorio', category: 'LAB' },
    { key: 'lab_web', value: 'www.labolab.com.ec', label: 'Sitio web', category: 'LAB' },
    { key: 'lab_director', value: 'Dra. Cecilia', label: 'Director/a técnico', category: 'LAB' },
    { key: 'iva_rate', value: '15', label: 'Tasa IVA (%)', category: 'FISCAL' },
    { key: 'quote_valid_days', value: '15', label: 'Vigencia cotización (días)', category: 'FISCAL' },
    { key: 'label_printer_model', value: 'Brother TD-4210D', label: 'Modelo de impresora', category: 'IMPRESION' },
    { key: 'label_size_large', value: '80x40', label: 'Etiqueta grande (mm)', category: 'IMPRESION' },
    { key: 'label_size_small', value: '57x27', label: 'Etiqueta pequeña (mm)', category: 'IMPRESION' },
    { key: 'label_dpi', value: '203', label: 'Resolución impresión (DPI)', category: 'IMPRESION' },
    { key: 'sample_code_prefix', value: 'MUE', label: 'Prefijo código muestra', category: 'CODIFICACION' },
    { key: 'request_code_prefix', value: 'SOL', label: 'Prefijo código solicitud', category: 'CODIFICACION' },
    { key: 'quote_code_prefix', value: 'COT', label: 'Prefijo código cotización', category: 'CODIFICACION' },
    { key: 'work_order_code_prefix', value: 'OT', label: 'Prefijo código orden', category: 'CODIFICACION' },
    { key: 'report_code_prefix', value: 'REP', label: 'Prefijo código reporte', category: 'CODIFICACION' },
  ];

  for (const c of configs) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: { value: c.value },
      create: c,
    });
  }
  console.log('✅ System config created');

  // 9. Initialize counters
  const currentYear = new Date().getFullYear();
  const counters = [
    { key: 'SOL', prefix: 'SOL', year: currentYear, sequence: 0 },
    { key: 'COT', prefix: 'COT', year: currentYear, sequence: 0 },
    { key: 'OT', prefix: 'OT', year: currentYear, sequence: 0 },
    { key: 'MUE', prefix: 'MUE', year: currentYear, sequence: 0 },
    { key: 'REP', prefix: 'REP', year: currentYear, sequence: 0 },
  ];

  for (const ct of counters) {
    await prisma.counter.upsert({
      where: { key: ct.key },
      update: {},
      create: ct,
    });
  }
  console.log('✅ Counters initialized');

  // 10. Demo end-to-end flows (idempotentes) — 2 ejemplos funcionales completos
  await seedDemoFlows(adminUser.id);
  console.log('✅ Demo end-to-end flows created');

  console.log('🎉 Seed completed successfully!');
}

// ---------- Flujos demo end-to-end (idempotentes) ----------
async function seedDemoFlows(adminId: string) {
  const clienteA = await prisma.client.findUnique({ where: { ruc: '1790000000001' } });
  const clienteB = await prisma.client.findUnique({ where: { ruc: '0102345678001' } });
  const stLacteos = await prisma.sampleType.findUnique({ where: { name: 'Lácteos' } });
  const stAguas = await prisma.sampleType.findUnique({ where: { name: 'Aguas' } });

  // ===== DEMO 1: Leche — flujo COMPLETO con resultados e informe emitido =====
  if (clienteA && !(await prisma.analysisRequest.findUnique({ where: { requestNumber: 'SOL-DEMO-0001' } }))) {
    const codes = ['FQ-GRA', 'FQ-PRO', 'FQ-DEN', 'FQ-ACI', 'FQ-SOL', 'MI-COL', 'MI-ECO'];
    const ats = await prisma.analysisType.findMany({ where: { code: { in: codes } } });
    const byCode: Record<string, any> = {}; ats.forEach((a: any) => (byCode[a.code] = a));

    const req = await prisma.analysisRequest.create({
      data: {
        requestNumber: 'SOL-DEMO-0001', clientId: clienteA.id, sampleTypeId: stLacteos?.id ?? null,
        description: 'Leche entera pasteurizada', productName: 'Leche entera pasteurizada', brand: 'La Vaquita',
        lot: 'L-2026-045', packaging: 'Funda de polietileno 1 L', contentAmount: '1 L', sampleCount: 2,
        storageCondition: 'REFRIGERACION', responsibleName: 'María García', status: 'CONFIRMADA', createdById: adminId,
        observations: 'Análisis de control de calidad de rutina.',
        items: { create: ats.map((a: any) => ({ analysisTypeId: a.id, quantity: 1 })) },
      },
    });
    const subtotal = ats.reduce((s: number, a: any) => s + (a.basePrice ?? 0), 0);
    const taxAmount = +(subtotal * 0.15).toFixed(2);
    const quote = await prisma.quote.create({
      data: {
        quoteNumber: 'COT-DEMO-0001', requestId: req.id, clientId: clienteA.id, subtotal, discount: 0,
        taxRate: 15, taxAmount, total: +(subtotal + taxAmount).toFixed(2), validDays: 15, status: 'ACEPTADA',
        acceptedAt: new Date(), sentAt: new Date(), createdById: adminId,
        conditions: 'Precios en USD. No incluyen toma de muestra. Vigencia 15 días.',
        items: { create: ats.map((a: any) => ({ analysisTypeId: a.id, quantity: 1, unitPrice: a.basePrice ?? 0, totalPrice: a.basePrice ?? 0 })) },
      },
    });
    const est = new Date(); est.setDate(est.getDate() + 5);
    const wo = await prisma.workOrder.create({
      data: {
        orderNumber: 'OT-DEMO-0001', quoteId: quote.id, clientId: clienteA.id, status: 'EN_PROCESO', estimatedDelivery: est,
        items: { create: ats.map((a: any) => ({ analysisTypeId: a.id, area: a.area, quantity: 1 })) },
      },
    });
    const sampleFQ = await prisma.sample.create({
      data: { sampleCode: 'MUE-DEMO-0001', workOrderId: wo.id, sampleTypeId: stLacteos?.id ?? null,
        description: 'Leche entera pasteurizada - La Vaquita', quantity: '500', unit: 'ml',
        storageCondition: 'REFRIGERACION', area: 'FISICOQUIMICA', status: 'ANALIZADA', notes: 'Lote: L-2026-045' },
    });
    const sampleMICA = await prisma.sample.create({
      data: { sampleCode: 'MUE-DEMO-0002', workOrderId: wo.id, sampleTypeId: stLacteos?.id ?? null,
        description: 'Leche entera pasteurizada - La Vaquita', quantity: '500', unit: 'ml',
        storageCondition: 'REFRIGERACION', area: 'MICROBIOLOGIA', status: 'ANALIZADA', notes: 'Lote: L-2026-045' },
    });
    const resultVals: Record<string, { value: string; num: number | null }> = {
      'FQ-GRA': { value: '3,2', num: 3.2 }, 'FQ-PRO': { value: '3,1', num: 3.1 },
      'FQ-DEN': { value: '1,030', num: 1.030 }, 'FQ-ACI': { value: '0,16', num: 0.16 },
      'FQ-SOL': { value: '11,5', num: 11.5 }, 'MI-COL': { value: '< 10', num: 0 }, 'MI-ECO': { value: '< 10', num: 0 },
    };
    for (const code of codes) {
      const at = byCode[code]; if (!at) continue;
      const rv = resultVals[code];
      const sid = at.area === 'MICROBIOLOGIA' ? sampleMICA.id : sampleFQ.id;
      const outOfRange = rv.num != null && ((at.minValue != null && rv.num < at.minValue) || (at.maxValue != null && rv.num > at.maxValue));
      await prisma.analysisResult.create({
        data: { sampleId: sid, analysisTypeId: at.id, value: rv.value, numericValue: rv.num, unit: at.unit,
          method: at.method, outOfRange, status: 'VERIFICADO', analyzedAt: new Date(), verifiedAt: new Date() },
      });
    }
    await prisma.report.create({
      data: {
        reportNumber: 'REP-DEMO-0001', workOrderId: wo.id, status: 'EMITIDO', emittedAt: new Date(), createdById: adminId,
        analystName: 'Carlos López', directorName: 'Dirección Técnica LABOLAB',
        conclusions: 'Todos los parámetros analizados se encuentran dentro de los límites establecidos por la norma NTE INEN aplicable para leche pasteurizada.',
        observations: 'Muestra recibida en condiciones adecuadas de refrigeración. Ensayos realizados bajo métodos acreditados.',
      },
    });
  }

  // ===== DEMO 2: Agua — flujo hasta muestras registradas (pendientes de resultados) =====
  if (clienteB && !(await prisma.analysisRequest.findUnique({ where: { requestNumber: 'SOL-DEMO-0002' } }))) {
    const codes = ['FQ-PH', 'MI-COL', 'MI-ECO', 'MI-AER'];
    const ats = await prisma.analysisType.findMany({ where: { code: { in: codes } } });
    const req = await prisma.analysisRequest.create({
      data: {
        requestNumber: 'SOL-DEMO-0002', clientId: clienteB.id, sampleTypeId: stAguas?.id ?? null,
        description: 'Agua purificada envasada', productName: 'Agua purificada envasada', brand: 'Cristalina',
        lot: 'A-2026-112', packaging: 'Botellón PET 20 L', contentAmount: '20 L', sampleCount: 2,
        storageCondition: 'AMBIENTE', responsibleName: 'Roberto Andrade', status: 'CONFIRMADA', createdById: adminId,
        observations: 'Control microbiológico y pH.',
        items: { create: ats.map((a: any) => ({ analysisTypeId: a.id, quantity: 1 })) },
      },
    });
    const subtotal = ats.reduce((s: number, a: any) => s + (a.basePrice ?? 0), 0);
    const taxAmount = +(subtotal * 0.15).toFixed(2);
    const quote = await prisma.quote.create({
      data: {
        quoteNumber: 'COT-DEMO-0002', requestId: req.id, clientId: clienteB.id, subtotal, discount: 0,
        taxRate: 15, taxAmount, total: +(subtotal + taxAmount).toFixed(2), validDays: 15, status: 'ACEPTADA',
        acceptedAt: new Date(), sentAt: new Date(), createdById: adminId,
        conditions: 'Precios en USD. No incluyen toma de muestra. Vigencia 15 días.',
        items: { create: ats.map((a: any) => ({ analysisTypeId: a.id, quantity: 1, unitPrice: a.basePrice ?? 0, totalPrice: a.basePrice ?? 0 })) },
      },
    });
    const est = new Date(); est.setDate(est.getDate() + 5);
    const wo = await prisma.workOrder.create({
      data: {
        orderNumber: 'OT-DEMO-0002', quoteId: quote.id, clientId: clienteB.id, status: 'EN_PROCESO', estimatedDelivery: est,
        items: { create: ats.map((a: any) => ({ analysisTypeId: a.id, area: a.area, quantity: 1 })) },
      },
    });
    await prisma.sample.create({
      data: { sampleCode: 'MUE-DEMO-0003', workOrderId: wo.id, sampleTypeId: stAguas?.id ?? null,
        description: 'Agua purificada envasada - Cristalina', quantity: '1000', unit: 'ml',
        storageCondition: 'AMBIENTE', area: 'FISICOQUIMICA', status: 'RECIBIDA', notes: 'Lote: A-2026-112' },
    });
    await prisma.sample.create({
      data: { sampleCode: 'MUE-DEMO-0004', workOrderId: wo.id, sampleTypeId: stAguas?.id ?? null,
        description: 'Agua purificada envasada - Cristalina', quantity: '1000', unit: 'ml',
        storageCondition: 'AMBIENTE', area: 'MICROBIOLOGIA', status: 'RECIBIDA', notes: 'Lote: A-2026-112' },
    });
  }
}

main()
  .catch((e: any) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
