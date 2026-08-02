# 💰 App Financiera Personal

Aplicación móvil (APK Android) de gestión financiera personal, comercial y flujo de caja optimizada para el contexto **bimoneda Venezuela (USD / BS)**.

## Stack Tecnológico

- **React Native** + **Expo SDK 57**
- **Expo Router v4** (navegación basada en archivos)
- **expo-sqlite** (persistencia 100% local)
- **TypeScript** estricto

## Funcionalidades

- 📊 **Dashboard**: Patrimonio neto, flujo del mes, tarjetas de resumen
- 💸 **Deudas**: Por cobrar y por pagar con historial de abonos
- 🔄 **Flujo de Caja**: Ingresos y gastos con filtros mensuales
- 📈 **Inversiones**: Portafolio con aportes, retiros y ganancias
- 🧮 **Simulador**: Bola de Nieve vs Avalancha para desendeudamiento
- 📷 **OCR**: Lector de capturas de Pago Móvil / Binance
- 🔐 **Biometría**: Autenticación con huella / Face ID
- 💾 **Backup**: Exportar/importar JSON completo

## Instalación

```bash
# Instalar dependencias
npm install

# Instalar dependencias nativas Expo
npx expo install expo-sqlite expo-local-authentication expo-file-system expo-sharing expo-camera expo-image-picker expo-document-picker expo-notifications @expo/vector-icons react-native-safe-area-context react-native-screens

# OCR (opcional)
npm install @infinitered/react-native-mlkit-ocr

# Iniciar en desarrollo
npx expo start

# Build APK (requiere cuenta EAS)
eas build --platform android --profile preview
```

## Estructura

```
app/
├── _layout.tsx          # Root: DB init + biometría
├── tabs/
│   ├── index.tsx        # Dashboard
│   ├── deudas.tsx       # Gestión de deudas
│   ├── flujo.tsx        # Flujo de caja
│   ├── inversiones.tsx  # Portafolio
│   └── herramientas.tsx # Simulador + OCR
└── settings.tsx         # Configuración

src/
├── db/
│   ├── database.ts      # Schema + CRUD helpers
│   └── seed.ts          # Datos iniciales
├── hooks/               # useDashboard, useDeudas, useFlujo, useInversiones
├── types/               # Tipos TypeScript globales
├── constants/           # Colores, categorías, constantes
└── utils/               # currency.ts (formateo, conversión, alertas)
```

## Datos Iniciales (Seed)

**Por Pagar — $2,742.50:**
- Gregory: $1,250 capital + $312.50 interés mensual (día 7)
- Guillermo: $620.00
- Colegio Valentina: $570.00
- Jhoan: $250.00

**Por Cobrar — $1,477.36:**
- Leonardo dos Santos: $520.00
- Javier y el Club: $247.36
- Ricardo, Renato: $200.00 c/u
- José, Tío Julio: $100.00 c/u
- Ailyn: $50.00 · Javier (Binance): $40.00 · Cielo: $20.00
