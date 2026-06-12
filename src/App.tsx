import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Gauge,
  HelpCircle,
  History as HistoryIcon,
  LineChart,
  Lightbulb,
  MoreHorizontal,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
  Youtube,
} from 'lucide-react';

type Direction = 'LONG' | 'SHORT';
type StopInputMode = 'percent' | 'price';
type CalculatorMode = 'simple' | 'detailed';

type CalculationSnapshot = {
  deposit: number;
  dailyRiskPercent: number;
  tradesPerDay: number;
  selectedLeverage: number;
  direction: Direction;
  entryPrice: string;
  stopPercent: number;
  stopInputMode: StopInputMode;
  stopLoss: string;
  takeProfit: string;
};

type CalculationSummary = {
  leverage: number;
  entryAmount: number;
  positionSize: number;
  riskPerTrade: number;
  dailyRiskAmount: number;
  rr: number;
};

type HistoryItem = {
  id: string;
  instrument: string;
  direction: Direction;
  risk: string;
  rr: string;
  position: string;
  date: string;
  snapshot: CalculationSnapshot;
  summary: CalculationSummary;
};

const HISTORY_KEY = 'financial-freedom-risk-history';

function App() {
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('detailed');
  const [deposit, setDeposit] = useState(1000);
  const [dailyRiskPercent, setDailyRiskPercent] = useState(5);
  const [tradesPerDay, setTradesPerDay] = useState(3);
  const [selectedLeverage, setSelectedLeverage] = useState(1);
  const [direction, setDirection] = useState<Direction>('LONG');
  const [entryPrice, setEntryPrice] = useState('100.00');
  const [stopPercent, setStopPercent] = useState(7);
  const [stopInputMode, setStopInputMode] = useState<StopInputMode>('percent');
  const [stopLoss, setStopLoss] = useState('93.00');
  const [takeProfit, setTakeProfit] = useState('118.00');
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(() => readHistory());

  const calc = useMemo(() => {
    return calculateRiskValues({
      dailyRiskPercent,
      deposit,
      entryPrice,
      selectedLeverage,
      stopPercent,
      stopLoss,
      takeProfit,
      tradesPerDay,
    });
  }, [
    dailyRiskPercent,
    deposit,
    entryPrice,
    selectedLeverage,
    stopPercent,
    stopLoss,
    takeProfit,
    tradesPerDay,
  ]);

  const errors = useMemo(() => {
    const nextErrors: string[] = [];

    if (deposit <= 0) nextErrors.push('Депозит должен быть больше 0.');
    if (dailyRiskPercent <= 0) nextErrors.push('Лимит риска должен быть больше 0.');
    if (tradesPerDay <= 0) nextErrors.push('Количество сделок должно быть больше 0.');
    if (stopPercent <= 0) nextErrors.push('Процент Stop Loss должен быть больше 0.');
    if (!Number.isFinite(calc.entry) || calc.entry <= 0) {
      nextErrors.push('Цена входа должна быть больше 0.');
    }
    if (!Number.isFinite(calc.sl) || calc.sl <= 0) {
      nextErrors.push('Stop Loss должен быть больше 0.');
    }
    if (!Number.isFinite(calc.tp) || calc.tp <= 0) {
      nextErrors.push('Take Profit должен быть больше 0.');
    }

    if (direction === 'LONG') {
      if (calc.sl >= calc.entry) nextErrors.push('Для LONG Stop Loss должен быть ниже Entry.');
      if (calc.tp <= calc.entry) nextErrors.push('Для LONG Take Profit должен быть выше Entry.');
    } else {
      if (calc.sl <= calc.entry) nextErrors.push('Для SHORT Stop Loss должен быть выше Entry.');
      if (calc.tp >= calc.entry) nextErrors.push('Для SHORT Take Profit должен быть ниже Entry.');
    }

    if (selectedLeverage <= 0) {
      nextErrors.push('Кредитное плечо должно быть больше 0.');
    } else if (calc.entryAmount > deposit + 0.01) {
      nextErrors.push('Сумма входа больше депозита. Увеличьте плечо или уменьшите риск.');
    }

    return nextErrors;
  }, [
    calc.entry,
    calc.positionSize,
    calc.sl,
    calc.tp,
    calc.entryAmount,
    dailyRiskPercent,
    deposit,
    direction,
    selectedLeverage,
    stopPercent,
    tradesPerDay,
  ]);
  const simpleErrors = useMemo(() => {
    const nextErrors: string[] = [];

    if (deposit <= 0) nextErrors.push('Депозит должен быть больше 0.');
    if (dailyRiskPercent <= 0) nextErrors.push('Лимит риска должен быть больше 0.');
    if (tradesPerDay <= 0) nextErrors.push('Количество сделок должно быть больше 0.');
    if (stopPercent <= 0) nextErrors.push('Процент стопа должен быть больше 0.');

    return nextErrors;
  }, [dailyRiskPercent, deposit, stopPercent, tradesPerDay]);

  const activeErrors = calculatorMode === 'simple' ? simpleErrors : errors;
  const isValid = activeErrors.length === 0;
  const leverageLabel = formatSelectedLeverage(calc.selectedLeverage);
  const riskPercentOfDeposit =
    deposit > 0 ? Math.max(0, (calc.riskPerTrade / deposit) * 100) : 0;
  const isBalanced = errors.length === 0 && calc.rr >= 1.5 && riskPercentOfDeposit <= 3;

  const updateStopPercent = (value: number) => {
    const nextPercent = Number.isFinite(value) ? value : 0;
    setStopPercent(nextPercent);
    const nextStopLoss = getStopLossFromPercent(entryPrice, direction, nextPercent);
    if (nextStopLoss) setStopLoss(nextStopLoss);
  };

  const updateStopLoss = (value: string) => {
    setStopLoss(value);
    const nextPercent = getStopPercentFromPrices(entryPrice, value);
    if (nextPercent !== null) setStopPercent(nextPercent);
  };

  const updateEntryPrice = (value: string) => {
    setEntryPrice(value);
    const nextStopLoss = getStopLossFromPercent(value, direction, stopPercent);
    if (nextStopLoss) setStopLoss(nextStopLoss);
  };

  const updateDirection = (value: Direction) => {
    setDirection(value);
    const nextStopLoss = getStopLossFromPercent(entryPrice, value, stopPercent);
    if (nextStopLoss) setStopLoss(nextStopLoss);
  };

  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    document.body.style.overflow = isFaqOpen ? 'hidden' : '';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFaqOpen(false);
    };

    if (isFaqOpen) window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFaqOpen]);

  const saveCalculation = () => {
    if (!isValid) {
      setNotice('Исправьте ошибки в параметрах сделки перед сохранением.');
      return;
    }

    const nextItem: HistoryItem = {
      id: makeId(),
      instrument: 'CUSTOM',
      direction,
      risk: formatPercent(riskPercentOfDeposit),
      rr: `1 : ${formatRatio(calc.rr)}`,
      position: formatMoney(calc.positionSize),
      date: formatDateLabel(new Date()),
      snapshot: {
        deposit,
        dailyRiskPercent,
        tradesPerDay,
        selectedLeverage,
        direction,
        entryPrice,
        stopPercent,
        stopInputMode,
        stopLoss,
        takeProfit,
      },
      summary: {
        leverage: selectedLeverage,
        entryAmount: calc.entryAmount,
        positionSize: calc.positionSize,
        riskPerTrade: calc.riskPerTrade,
        dailyRiskAmount: calc.dailyRiskAmount,
        rr: calc.rr,
      },
    };

    setHistory((items) => [nextItem, ...items].slice(0, 12));
    setNotice('Расчёт сохранён в историю.');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((items) => items.filter((item) => item.id !== id));
  };

  const applyHistoryItem = (item: HistoryItem) => {
    setDeposit(item.snapshot.deposit);
    setDailyRiskPercent(item.snapshot.dailyRiskPercent);
    setTradesPerDay(item.snapshot.tradesPerDay);
    setSelectedLeverage(item.snapshot.selectedLeverage);
    setDirection(item.snapshot.direction);
    setStopPercent(item.snapshot.stopPercent);
    setStopInputMode(item.snapshot.stopInputMode);
    setEntryPrice(item.snapshot.entryPrice);
    setStopLoss(item.snapshot.stopLoss);
    setTakeProfit(item.snapshot.takeProfit);
    setNotice('Расчёт добавлен в калькулятор.');
    window.requestAnimationFrame(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#fbfaff] text-ink">
      <Header
        onOpenFaq={() => setIsFaqOpen(true)}
        onSave={saveCalculation}
        notice={notice}
      />

      <main className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <Hero />

        <CalculatorModeSwitch value={calculatorMode} onChange={setCalculatorMode} />

        <section
          id="calculator"
          className="grid gap-5 lg:grid-cols-[0.92fr_1.28fr]"
          aria-label="Калькулятор сделки"
        >
          {calculatorMode === 'detailed' ? (
            <>
              <CalculatorPanel
                calc={calc}
                dailyRiskPercent={dailyRiskPercent}
                deposit={deposit}
                direction={direction}
                entryPrice={entryPrice}
                errors={errors}
                setDailyRiskPercent={setDailyRiskPercent}
                setDeposit={setDeposit}
                setDirection={updateDirection}
                setEntryPrice={updateEntryPrice}
                setSelectedLeverage={setSelectedLeverage}
                setStopInputMode={setStopInputMode}
                setStopLoss={updateStopLoss}
                setStopPercent={updateStopPercent}
                setTakeProfit={setTakeProfit}
                setTradesPerDay={setTradesPerDay}
                stopInputMode={stopInputMode}
                stopLoss={stopLoss}
                stopPercent={stopPercent}
                takeProfit={takeProfit}
                tradesPerDay={tradesPerDay}
              />

              <ResultsPanel
                calc={calc}
                direction={direction}
                isBalanced={isBalanced}
                isValid={errors.length === 0}
                leverageLabel={leverageLabel}
              />
            </>
          ) : (
            <>
              <SimpleCalculatorPanel
                calc={calc}
                dailyRiskPercent={dailyRiskPercent}
                deposit={deposit}
                errors={simpleErrors}
                setDailyRiskPercent={setDailyRiskPercent}
                setDeposit={setDeposit}
                setStopPercent={updateStopPercent}
                setTradesPerDay={setTradesPerDay}
                stopPercent={stopPercent}
                tradesPerDay={tradesPerDay}
              />

              <SimpleResultsPanel calc={calc} isValid={simpleErrors.length === 0} />
            </>
          )}
        </section>

        <HistorySection
          history={history}
          onApply={applyHistoryItem}
          onDelete={deleteHistoryItem}
          onSave={saveCalculation}
        />

        <EducationSection />
      </main>

      <Footer onOpenFaq={() => setIsFaqOpen(true)} />

      {isFaqOpen && <FaqModal onClose={() => setIsFaqOpen(false)} />}
    </div>
  );
}

type Calc = {
  entry: number;
  sl: number;
  tp: number;
  dailyRiskAmount: number;
  riskPerTrade: number;
  positionSize: number;
  riskDistance: number;
  profitDistance: number;
  riskDistancePercent: number;
  rewardDistancePercent: number;
  rr: number;
  potentialProfit: number;
  entryAmount: number;
  selectedLeverage: number;
};

type CalculationInput = {
  deposit: number;
  dailyRiskPercent: number;
  tradesPerDay: number;
  selectedLeverage: number;
  entryPrice: string;
  stopPercent: number;
  stopLoss: string;
  takeProfit: string;
};

function calculateRiskValues({
  dailyRiskPercent,
  deposit,
  entryPrice,
  selectedLeverage,
  stopPercent,
  stopLoss,
  takeProfit,
  tradesPerDay,
}: CalculationInput): Calc {
  const entry = parsePrice(entryPrice);
  const sl = parsePrice(stopLoss);
  const tp = parsePrice(takeProfit);
  const dailyRiskAmount =
    deposit > 0 && dailyRiskPercent > 0 ? (deposit * dailyRiskPercent) / 100 : 0;
  const riskPerTrade = tradesPerDay > 0 ? dailyRiskAmount / tradesPerDay : 0;
  const riskDistancePrice = Math.abs(entry - sl);
  const profitDistance = Math.abs(tp - entry);
  const riskDistance = stopPercent > 0 ? stopPercent / 100 : 0;
  const riskDistancePercent = riskDistance * 100;
  const rewardDistancePercent = entry > 0 ? (profitDistance / entry) * 100 : 0;
  const positionSize = riskDistance > 0 ? riskPerTrade / riskDistance : 0;
  const rr = riskDistancePrice > 0 ? profitDistance / riskDistancePrice : 0;
  const potentialProfit = riskPerTrade * rr;
  const entryAmount = selectedLeverage > 0 ? positionSize / selectedLeverage : 0;

  return {
    entry,
    sl,
    tp,
    dailyRiskAmount,
    riskPerTrade,
    positionSize,
    riskDistance,
    profitDistance,
    riskDistancePercent,
    rewardDistancePercent,
    rr,
    potentialProfit,
    entryAmount,
    selectedLeverage,
  };
}

function Header({
  notice,
  onOpenFaq,
  onSave,
}: {
  notice: string;
  onOpenFaq: () => void;
  onSave: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-100/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="mobile-header-row flex w-full min-w-0 items-center justify-between gap-3 lg:w-auto">
          <BrandLogo />
          <button
            type="button"
            onClick={onOpenFaq}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-2xl border border-brand-200 bg-brand-50 px-3 text-brand-700 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 lg:hidden"
            aria-label="Открыть FAQ"
          >
            <HelpCircle size={19} />
            <span className="text-xs font-black">FAQ</span>
          </button>
        </div>

        <nav className="mobile-nav grid w-full max-w-[calc(100vw-2rem)] grid-cols-1 gap-1 overflow-hidden rounded-2xl border border-brand-100/80 bg-brand-50/60 p-1 text-xs font-semibold text-ink/80 sm:grid-cols-3 sm:text-sm lg:w-auto lg:max-w-none lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-2 lg:bg-transparent lg:p-0">
          <a className="nav-link" href="#calculator">
            Калькулятор
          </a>
          <a className="nav-link" href="#how-it-works">
            Как это работает
          </a>
          <a className="nav-link" href="#recommendations">
            Рекомендации
          </a>
          <button type="button" onClick={onOpenFaq} className="nav-link lg:hidden">
            FAQ
          </button>
        </nav>

        <div className="flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto">
          {notice && (
            <span className="hidden rounded-2xl border border-brand-100 bg-white px-3 py-2 text-xs font-semibold text-brand-700 shadow-soft xl:inline-flex">
              {notice}
            </span>
          )}
          <button type="button" onClick={onSave} className="primary-button w-full max-w-[calc(100vw-2rem)] sm:w-auto">
            <Save size={17} />
            Сохранить расчёт
          </button>
          <button
            type="button"
            onClick={onOpenFaq}
            className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white text-brand-700 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-600 lg:inline-flex"
            aria-label="Открыть FAQ"
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mb-5 overflow-hidden rounded-[28px] border border-brand-100 bg-white px-5 py-8 shadow-card sm:px-8 lg:px-9">
      <DecorativeChart />
      <div className="relative z-10 max-w-[320px] sm:max-w-[760px]">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
          <Calculator size={16} />
          Финансовая Свобода
        </p>
        <h1 className="max-w-full break-words text-[1.85rem] font-black leading-[1.08] text-ink sm:text-[3.2rem] lg:text-[3.75rem]">
          Калькулятор сделки
        </h1>
        <p className="mt-3 text-2xl font-extrabold text-brand-500 sm:text-3xl">
          Не азарт, а управляемый процесс.
        </p>
        <p className="mt-2 max-w-full text-base font-medium leading-7 text-ink/70 sm:max-w-[520px] sm:text-lg">
          Сначала считаем риск, стоп и размер позиции — и только потом открываем сделку.
        </p>
      </div>
    </section>
  );
}

function CalculatorModeSwitch({
  onChange,
  value,
}: {
  onChange: (value: CalculatorMode) => void;
  value: CalculatorMode;
}) {
  return (
    <section className="mode-switch-card" aria-label="Режим калькулятора">
      <div>
        <p>Режим расчёта</p>
        <h2>{value === 'simple' ? 'Простой расчёт' : 'Детальный расчёт'}</h2>
      </div>
      <div className="mode-switch-tabs" role="tablist" aria-label="Выбор режима расчёта">
        <button
          type="button"
          role="tab"
          aria-selected={value === 'simple'}
          className={value === 'simple' ? 'active' : ''}
          onClick={() => onChange('simple')}
        >
          <Calculator size={17} />
          Простой расчёт
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === 'detailed'}
          className={value === 'detailed' ? 'active' : ''}
          onClick={() => onChange('detailed')}
        >
          <SlidersHorizontal size={17} />
          Детальный расчёт
        </button>
      </div>
    </section>
  );
}

function CalculatorPanel({
  calc,
  dailyRiskPercent,
  deposit,
  direction,
  entryPrice,
  errors,
  setDailyRiskPercent,
  setDeposit,
  setDirection,
  setEntryPrice,
  setSelectedLeverage,
  setStopInputMode,
  setStopLoss,
  setStopPercent,
  setTakeProfit,
  setTradesPerDay,
  stopInputMode,
  stopLoss,
  stopPercent,
  takeProfit,
  tradesPerDay,
}: {
  calc: Calc;
  dailyRiskPercent: number;
  deposit: number;
  direction: Direction;
  entryPrice: string;
  errors: string[];
  setDailyRiskPercent: (value: number) => void;
  setDeposit: (value: number) => void;
  setDirection: (value: Direction) => void;
  setEntryPrice: (value: string) => void;
  setSelectedLeverage: (value: number) => void;
  setStopInputMode: (value: StopInputMode) => void;
  setStopLoss: (value: string) => void;
  setStopPercent: (value: number) => void;
  setTakeProfit: (value: string) => void;
  setTradesPerDay: (value: number) => void;
  stopInputMode: StopInputMode;
  stopLoss: string;
  stopPercent: number;
  takeProfit: string;
  tradesPerDay: number;
}) {
  return (
    <article className="panel-card calculator-panel">
      <PanelHeading icon={<SlidersHorizontal size={19} />} title="Параметры сделки" />

      <div className="calculator-panel-body">
        <FieldRow icon={<Wallet size={18} />} label="Ваш депозит">
          <AmountInput
            min={0}
            step={50}
            suffix="$"
            value={deposit}
            onChange={setDeposit}
          />
        </FieldRow>

        <DailyRiskControl
          dailyRiskAmount={calc.dailyRiskAmount}
          value={dailyRiskPercent}
          onChange={setDailyRiskPercent}
        />

        <FieldRow icon={<Calculator size={18} />} label="Количество сделок в день">
          <AmountInput
            min={1}
            step={1}
            suffix="шт"
            value={tradesPerDay}
            onChange={setTradesPerDay}
          />
        </FieldRow>

        <LeverageControl
          entryAmount={calc.entryAmount}
          value={calc.selectedLeverage}
          onChange={setSelectedLeverage}
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={`direction-button direction-long ${direction === 'LONG' ? 'direction-active' : ''}`}
            onClick={() => setDirection('LONG')}
          >
            <ArrowUpRight size={18} />
            LONG
          </button>
          <button
            type="button"
            className={`direction-button direction-short ${direction === 'SHORT' ? 'direction-active' : ''}`}
            onClick={() => setDirection('SHORT')}
          >
            <ArrowDownRight size={18} />
            SHORT
          </button>
        </div>

        <div className="price-rows">
          <PriceRow
            label="Цена входа"
            value={entryPrice}
            onChange={setEntryPrice}
          />
          <StopLossControl
            direction={direction}
            error={getStopLossFieldError(calc, direction, stopPercent)}
            mode={stopInputMode}
            onModeChange={setStopInputMode}
            onPercentChange={setStopPercent}
            onPriceChange={setStopLoss}
            percent={stopPercent}
            price={stopLoss}
          />
          <PriceRow
            label="Цена Take Profit"
            value={takeProfit}
            onChange={setTakeProfit}
            percent={calc.rewardDistancePercent}
            tone="success"
          />
        </div>

        {errors.length > 0 && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        <CatSticker alt="Котик с блокнотом" image="/kotik.png" tone="left" />
      </div>
    </article>
  );
}

function SimpleCalculatorPanel({
  calc,
  dailyRiskPercent,
  deposit,
  errors,
  setDailyRiskPercent,
  setDeposit,
  setStopPercent,
  setTradesPerDay,
  stopPercent,
  tradesPerDay,
}: {
  calc: Calc;
  dailyRiskPercent: number;
  deposit: number;
  errors: string[];
  setDailyRiskPercent: (value: number) => void;
  setDeposit: (value: number) => void;
  setStopPercent: (value: number) => void;
  setTradesPerDay: (value: number) => void;
  stopPercent: number;
  tradesPerDay: number;
}) {
  return (
    <article className="panel-card calculator-panel">
      <PanelHeading icon={<Calculator size={19} />} title="Параметры сделки" />

      <div className="calculator-panel-body">
        <FieldRow icon={<Wallet size={18} />} label="Ваш депозит">
          <AmountInput
            min={0}
            step={50}
            suffix="$"
            value={deposit}
            onChange={setDeposit}
          />
        </FieldRow>

        <DailyRiskControl
          dailyRiskAmount={calc.dailyRiskAmount}
          value={dailyRiskPercent}
          onChange={setDailyRiskPercent}
        />

        <FieldRow icon={<Calculator size={18} />} label="Количество сделок в день">
          <AmountInput
            min={1}
            step={1}
            suffix="шт"
            value={tradesPerDay}
            onChange={setTradesPerDay}
          />
        </FieldRow>

        <FieldRow icon={<SlidersHorizontal size={18} />} label="% стопа в сделке">
          <AmountInput
            min={0}
            step={0.1}
            suffix="%"
            value={stopPercent}
            onChange={setStopPercent}
          />
        </FieldRow>

        {errors.length > 0 && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        <CatSticker alt="Котик с блокнотом" image="/kotik.png" tone="left" />
      </div>
    </article>
  );
}

function ResultsPanel({
  calc,
  direction,
  isBalanced,
  isValid,
  leverageLabel,
}: {
  calc: Calc;
  direction: Direction;
  isBalanced: boolean;
  isValid: boolean;
  leverageLabel: string;
}) {
  return (
    <article className="panel-card results-panel">
      <div
        className={`mb-4 inline-flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-extrabold ${
          isBalanced
            ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
            : 'border-amber-100 bg-amber-50 text-amber-700'
        }`}
      >
        {isBalanced ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}
        {isBalanced
          ? 'Сделка выглядит сбалансированной'
          : isValid
            ? 'Проверьте соотношение риска и прибыли'
            : 'Нужно исправить параметры сделки'}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={<ShieldCheck size={22} />}
          label="Дневной лимит"
          tooltip="Максимальная сумма, которую вы готовы потерять за день: депозит × лимит риска."
          value={formatPreciseMoney(calc.dailyRiskAmount)}
        />
        <MetricCard
          icon={<Activity size={22} />}
          label="Риск на сделку"
          tooltip="Часть дневного лимита на одну сделку: дневной лимит ÷ количество сделок."
          value={formatApproxPreciseMoney(calc.riskPerTrade)}
        />
        <MetricCard
          icon={<LineChart size={22} />}
          label="Размер позиции"
          tooltip="Полный объём сделки. Считается как риск на сделку ÷ процент Stop Loss."
          value={formatMoney(calc.positionSize)}
        />
        <MetricCard
          icon={<Gauge size={22} />}
          label="Плечо"
          tooltip="Плечо выбирается вручную. Оно не меняет риск, а уменьшает сумму собственных средств для входа."
          value={leverageLabel}
        />
        <MetricCard
          icon={<CircleDollarSign size={22} />}
          label="Сумма входа"
          tooltip="Сумма входа — это маржа, которую нужно внести при выбранном плече: размер позиции ÷ плечо."
          value={formatApproxPreciseMoney(calc.entryAmount)}
        />
        <MetricCard
          icon={<Calculator size={22} />}
          label="Риск/прибыль"
          tooltip="Соотношение потенциальной прибыли к риску: расстояние до Take Profit ÷ расстояние до Stop Loss."
          value={`1 : ${formatRatio(calc.rr)}`}
        />
      </div>

      <RiskComparison
        rewardDistancePercent={calc.rewardDistancePercent}
        riskDistancePercent={calc.riskDistancePercent}
        rr={calc.rr}
      />

      <TradeMap calc={calc} direction={direction} />

      <div className="grid gap-3 md:grid-cols-2">
        <ScenarioCard
          icon={<ArrowDownRight size={19} />}
          tone="danger"
          title="Если сработает Stop Loss"
          value={`−${formatMoney(calc.riskPerTrade)}`}
          text="Потеря в рамках риска"
        />
        <ScenarioCard
          icon={<ArrowUpRight size={19} />}
          tone="success"
          title="Если сработает Take Profit"
          value={`+${formatMoney(calc.potentialProfit)}`}
        />
      </div>

      <section id="recommendations" className="recommendations-card">
        <div>
          <div className="flex items-center gap-3">
            <span className="icon-tile">
              <Lightbulb size={19} />
            </span>
            <h2 className="section-title">Рекомендации</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-ink/70">
            {[
              'Не рискуйте всем депозитом.',
              'Держите риск одной сделки в пределах дневного лимита.',
              'Сначала считайте стоп и размер позиции.',
              'Главная задача новичка — сохранить депозит.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0 text-brand-600" size={17} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="shield-visual" aria-hidden="true">
          <ShieldCheck size={82} strokeWidth={1.4} />
        </div>
      </section>

      <CatSticker alt="Кошечка с листом" image="/kissa.png" tone="right" />
    </article>
  );
}

function SimpleResultsPanel({ calc, isValid }: { calc: Calc; isValid: boolean }) {
  return (
    <article className="panel-card results-panel simple-results-panel">
      <div
        className={`mb-4 inline-flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-extrabold ${
          isValid
            ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
            : 'border-amber-100 bg-amber-50 text-amber-700'
        }`}
      >
        {isValid ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}
        {isValid ? 'Расчёт готов' : 'Проверьте базовые параметры'}
      </div>

      <section className="simple-result-hero">
        <span className="simple-result-icon">
          <CircleDollarSign size={30} />
        </span>
        <div>
          <p>Объём позиции / сумма входа</p>
          <strong>{formatApproxPreciseMoney(calc.positionSize)}</strong>
        </div>
      </section>

      <CatSticker alt="Кошечка с листом" image="/kissa.png" tone="right" />
    </article>
  );
}

function HistorySection({
  history,
  onApply,
  onDelete,
  onSave,
}: {
  history: HistoryItem[];
  onApply: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <section className="mt-5 rounded-[26px] border border-brand-100 bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="icon-tile">
            <HistoryIcon size={19} />
          </span>
          <h2 className="text-2xl font-black text-ink">История расчётов</h2>
        </div>
        <button type="button" onClick={onSave} className="secondary-button">
          <Save size={17} />
          Сохранить расчёт
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-100">
        <table className="min-w-[980px] w-full border-collapse bg-white text-left text-sm">
          <thead className="bg-brand-50 text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3 font-black">Инструмент</th>
              <th className="px-4 py-3 font-black">Направление</th>
              <th className="px-4 py-3 font-black">Риск</th>
              <th className="px-4 py-3 font-black">Риск/прибыль</th>
              <th className="px-4 py-3 font-black">Размер позиции</th>
              <th className="px-4 py-3 font-black">Плечо</th>
              <th className="px-4 py-3 font-black">Сумма входа</th>
              <th className="px-4 py-3 font-black">Дата</th>
              <th className="px-4 py-3 text-right font-black"> </th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr className="border-t border-brand-100/80">
                <td colSpan={9} className="px-4 py-8 text-center text-sm font-bold text-ink/50">
                  История пока пустая. Сохранённые расчёты появятся здесь только в вашем браузере.
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <Fragment key={item.id}>
                  <tr className="border-t border-brand-100/80 transition hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 font-extrabold text-ink">
                        <span className="history-symbol">
                          <LineChart size={15} />
                        </span>
                        {item.instrument}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`direction-pill ${item.direction === 'LONG' ? 'long' : 'short'}`}>
                        {item.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-ink/70">{item.risk}</td>
                    <td className="px-4 py-3 font-black text-brand-800">{item.rr}</td>
                    <td className="px-4 py-3 font-bold text-ink/70">{item.position}</td>
                    <td className="px-4 py-3 font-bold text-ink/70">{formatSelectedLeverage(item.summary.leverage)}</td>
                    <td className="px-4 py-3 font-bold text-ink/70">{formatPreciseMoney(item.summary.entryAmount)}</td>
                    <td className="px-4 py-3 font-semibold text-ink/60">{item.date}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className="table-icon-button"
                          onClick={() => setOpenMenuId((id) => (id === item.id ? null : item.id))}
                          aria-expanded={openMenuId === item.id}
                          aria-label={`Меню расчёта ${item.instrument}`}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-button danger"
                          onClick={() => onDelete(item.id)}
                          aria-label={`Удалить расчёт ${item.instrument}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {openMenuId === item.id && (
                    <tr className="border-t border-brand-100/80 bg-brand-50/50">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="history-row-menu">
                          <button
                            type="button"
                            className="history-menu-action"
                            onClick={() => {
                              onApply(item);
                              setOpenMenuId(null);
                            }}
                          >
                            <Calculator size={16} />
                            Добавить в калькулятор
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CatSticker({
  alt,
  image,
  tone,
}: {
  alt: string;
  image: string;
  tone: 'left' | 'right';
}) {
  return (
    <div className={`cat-sticker-wrap ${tone}`} aria-label="Помощник расчёта">
      <img src={image} alt={alt} className={`cat-sticker ${tone}`} />
    </div>
  );
}

function EducationSection() {
  const steps = [
    {
      title: 'Введите депозит',
      text: 'Например, 1000$.',
      icon: <Wallet size={22} />,
    },
    {
      title: 'Задайте лимит риска',
      text: '5% от депозита = 50$ максимум потерь за день.',
      icon: <ShieldCheck size={22} />,
    },
    {
      title: 'Разделите риск между сделками',
      text: 'Если сделок 3, риск на одну ≈ 16–17$.',
      icon: <Activity size={22} />,
    },
    {
      title: 'Укажите стоп',
      text: 'При стопе 7% размер позиции ≈ 238$.',
      icon: <Gauge size={22} />,
    },
  ];

  return (
    <section id="how-it-works" className="mt-5 rounded-[26px] border border-brand-100 bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-ink">Как пользоваться калькулятором</h2>
          <p className="mt-2 max-w-[640px] text-sm font-semibold leading-6 text-ink/60">
            4 шага, чтобы рассчитать риск и размер позиции перед входом в сделку.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.title} className="usage-card">
            <div className="flex items-center justify-between gap-3">
              <span className="usage-number">{index + 1}</span>
              <span className="usage-icon">{step.icon}</span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-center text-base font-black leading-7 text-brand-700">
        Главная мысль: сначала считайте риск, стоп и размер позиции — и только потом открывайте сделку.
      </p>
    </section>
  );
}

function FaqModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4 py-8 backdrop-blur-sm">
      <div className="modal-card max-h-[88vh] w-full max-w-[860px] overflow-y-auto rounded-[24px] border border-brand-100 bg-[#fcfbff] p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold text-brand-600">Финансовая Свобода</p>
            <h2 className="mt-1 text-3xl font-black text-ink">FAQ / Формулы</h2>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-100 bg-white text-brand-700 transition hover:bg-brand-50"
            onClick={onClose}
            aria-label="Закрыть FAQ"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4">
          <FaqCard
            title="Как считается риск?"
            formula={
              <>
                <span className="block">Дневной риск = Депозит × Лимит риска / 100</span>
                <span className="block">Риск на сделку = Дневной риск ÷ Количество сделок</span>
              </>
            }
            example={
              <>
                <span className="block">1000$ × 5% = 50$</span>
                <span className="block">50$ ÷ 3 ≈ 16.67$</span>
              </>
            }
          />
          <FaqCard
            title="Как считается размер позиции?"
            formula={
              <>
                <span className="block">Стоп можно ввести процентом из сигнала или конкретной ценой Stop Loss.</span>
                <span className="block">Процент стопа = |Entry − Stop Loss| ÷ Entry</span>
                <span className="block">Размер позиции = Риск на сделку ÷ Процент стопа</span>
              </>
            }
            example={
              <>
                <span className="block">Если в сигнале указан стоп 7%, просто введите 7%.</span>
                <span className="block">Entry 100$, Stop Loss 93$ → стоп 7%</span>
                <span className="block">16.67$ ÷ 0.07 ≈ 238$</span>
              </>
            }
          />
          <FaqCard
            title="Как считается R/R?"
            formula="R/R = |Take Profit − Entry| ÷ |Entry − Stop Loss|"
            example={
              <>
                <span className="block">Entry 100$, Stop Loss 93$, Take Profit 118$</span>
                <span className="block">18 ÷ 7 ≈ 2.6, значит R/R = 1 : 2.6</span>
              </>
            }
          />
          <FaqCard
            title="Как считается сумма входа?"
            formula={
              <>
                <span className="block">Размер позиции не зависит от плеча.</span>
                <span className="block">Плечо выбирается вручную: 1x, 2x, 3x и т.д.</span>
                <span className="block">Оно не меняет риск, а только уменьшает сумму собственных средств для входа.</span>
                <span className="block">Сумма входа = Размер позиции ÷ Плечо</span>
              </>
            }
            example={
              <>
                <span className="block">Размер позиции 238$, плечо 2x</span>
                <span className="block">238$ ÷ 2 = 119$</span>
                <span className="block">При плече 2x для входа потребуется примерно 119$ маржи.</span>
              </>
            }
          />
          <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
            <h3 className="text-lg font-black text-brand-800">Почему важны лимиты?</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
              Лимиты удерживают риск под контролем, помогают пережить серию убытков и сохранить
              депозит в долгосрочной перспективе.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ onOpenFaq }: { onOpenFaq: () => void }) {
  return (
    <footer className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 text-white">
      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:px-8">
        <div>
          <BrandLogo inverse />
          <p className="mt-4 max-w-[260px] text-sm font-semibold leading-6 text-white/70">
            Управляй риском — управляй результатом.
          </p>
        </div>
        <FooterColumn title="Продукт" links={['Калькулятор', 'Рекомендации']} />
        <div>
          <h3 className="footer-title">Поддержка</h3>
          <button type="button" onClick={onOpenFaq} className="footer-link">
            FAQ
          </button>
        </div>
        <div className="md:text-right">
          <p className="text-sm font-bold text-white/80">© 2026 Финансовая Свобода</p>
          <div className="mt-4 flex gap-2 md:justify-end">
            <a
              aria-label="Telegram Финансовая Свобода"
              href="https://t.me/tradeLugueva"
              rel="noreferrer"
              target="_blank"
              className="social-link"
            >
              <Send size={18} />
            </a>
            <a
              aria-label="YouTube Финансовая Свобода"
              href="https://www.youtube.com/@Lugueva_Saida"
              rel="noreferrer"
              target="_blank"
              className="social-link"
            >
              <Youtube size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function BrandLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <a
      href="#calculator"
      className={`brand-logo ${inverse ? 'inverse' : ''}`}
      aria-label="Финансовая Свобода"
    >
      <img
        alt="Финансовая Свобода"
        src={inverse ? '/whitelogo.svg' : '/purplelogo.svg'}
      />
    </a>
  );
}

function PanelHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="icon-tile">{icon}</span>
      <h2 className="text-xl font-black text-ink">{title}</h2>
    </div>
  );
}

function FieldRow({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="field-row">
      <div className="flex items-center gap-3">
        <span className="field-icon">{icon}</span>
        <label className="text-sm font-black text-ink">{label}</label>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function AmountInput({
  max,
  min,
  onChange,
  step,
  suffix,
  value,
}: {
  max?: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  suffix: string;
  value: number;
}) {
  const [draft, setDraft] = useState(formatNumberInputValue(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) setDraft(formatNumberInputValue(value));
  }, [isEditing, value]);

  const commitDraft = () => {
    setIsEditing(false);
    const parsed = Number.parseFloat(draft.replace(',', '.'));
    const fallback = min > 0 ? min : 0;
    const nextValue = Number.isFinite(parsed) ? clamp(parsed, min, max ?? Number.POSITIVE_INFINITY) : fallback;
    onChange(nextValue);
    setDraft(formatNumberInputValue(nextValue));
  };

  return (
    <div className="input-shell">
      <input
        inputMode="decimal"
        max={max}
        min={min}
        step={step}
        type="number"
        value={isEditing ? draft : formatNumberInputValue(value)}
        onBlur={commitDraft}
        onChange={(event) => {
          const rawValue = event.target.value;
          setDraft(rawValue);
          if (rawValue === '') {
            onChange(0);
            return;
          }
          const parsed = Number.parseFloat(rawValue.replace(',', '.'));
          if (Number.isFinite(parsed)) onChange(max === undefined ? parsed : Math.min(parsed, max));
        }}
        onFocus={() => {
          setIsEditing(true);
          setDraft(value === 0 ? '' : formatNumberInputValue(value));
        }}
      />
      <span>{suffix}</span>
    </div>
  );
}

function DailyRiskControl({
  dailyRiskAmount,
  onChange,
  value,
}: {
  dailyRiskAmount: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const min = 0.1;
  const max = 15;
  const sliderValue = clamp(value, min, max);
  const percent = clamp(((sliderValue - min) / (max - min)) * 100, 0, 100);

  return (
    <div className="daily-risk-card">
      <div className="daily-risk-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="field-icon">
            <Activity size={18} />
          </span>
          <div>
            <h3>Лимит риска на день</h3>
            <p>Максимум потерь за день: {formatMoney(dailyRiskAmount)}</p>
          </div>
        </div>
        <div className="daily-risk-value">
          <AmountInput
            max={max}
            min={0}
            step={0.1}
            suffix="%"
            value={value}
            onChange={onChange}
          />
        </div>
      </div>
      <RiskPercentButtons
        value={value}
        values={[1, 2, 3, 5, 10, 15]}
        onChange={onChange}
      />
      <div className="daily-risk-slider">
        <input
          aria-label="Процент лимита риска на день"
          className="risk-range"
          max={max}
          min={min}
          step={0.1}
          type="range"
          value={sliderValue}
          onChange={(event) => onChange(Number.parseFloat(event.currentTarget.value))}
          style={{
            background: `linear-gradient(90deg, #7447ee 0%, #7447ee ${percent}%, #ebe5fb ${percent}%, #ebe5fb 100%)`,
          }}
        />
        <div className="daily-risk-range-caption">
          <span>{formatPercent(min)}</span>
          <span>{formatPercent(value)}</span>
          <span>{formatPercent(max)}</span>
        </div>
      </div>
    </div>
  );
}

function LeverageControl({
  entryAmount,
  onChange,
  value,
}: {
  entryAmount: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const min = 1;
  const max = 100;
  const safeValue = clamp(value, min, max);
  const percent = clamp(((safeValue - min) / (max - min)) * 100, 0, 100);
  const updateValue = (nextValue: number) => onChange(Math.round(clamp(nextValue, min, max)));

  return (
    <div className="leverage-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="field-icon">
            <Gauge size={18} />
          </span>
          <div>
            <h3>Кредитное плечо</h3>
            <p>Сумма входа: {formatPreciseMoney(entryAmount)}</p>
          </div>
        </div>
        <strong>{formatSelectedLeverage(safeValue)}</strong>
      </div>

      <div className="leverage-control-grid">
        <AmountInput
          max={max}
          min={min}
          step={1}
          suffix="x"
          value={safeValue}
          onChange={updateValue}
        />
        <div className="leverage-slider">
          <input
            aria-label="Кредитное плечо"
            className="risk-range"
            max={max}
            min={min}
            step={1}
            type="range"
            value={safeValue}
            onChange={(event) => updateValue(Number(event.currentTarget.value))}
            style={{
              background: `linear-gradient(90deg, #7447ee 0%, #7447ee ${percent}%, #ebe5fb ${percent}%, #ebe5fb 100%)`,
            }}
          />
          <div className="leverage-range-caption">
            <span>1x</span>
            <span>{formatSelectedLeverage(safeValue)}</span>
            <span>100x</span>
          </div>
        </div>
      </div>

      <p className="leverage-help">
        <CircleDollarSign size={16} />
        <span>Сумма входа / маржа: {formatPreciseMoney(entryAmount)}</span>
      </p>
    </div>
  );
}

function RiskPercentButtons({
  onChange,
  value,
  values,
}: {
  onChange: (value: number) => void;
  value: number;
  values: number[];
}) {
  return (
    <div className="risk-percent-buttons" aria-label="Лимит риска">
      {values.map((option) => (
        <button
          key={option}
          type="button"
          className={option === value ? 'active' : ''}
          onClick={() => onChange(option)}
        >
          {formatPercent(option)}
        </button>
      ))}
    </div>
  );
}

function StopLossControl({
  direction,
  error,
  mode,
  onModeChange,
  onPercentChange,
  onPriceChange,
  percent,
  price,
}: {
  direction: Direction;
  error: string;
  mode: StopInputMode;
  onModeChange: (value: StopInputMode) => void;
  onPercentChange: (value: number) => void;
  onPriceChange: (value: string) => void;
  percent: number;
  price: string;
}) {
  const percentBadge = direction === 'LONG' ? -Math.abs(percent) : Math.abs(percent);

  return (
    <div className="stop-loss-card">
      <div className="stop-loss-head">
        <div>
          <h3>Цена Stop Loss</h3>
          <p>Можно ввести процент стопа из сигнала, не считая цену вручную.</p>
        </div>
        <div className="stop-mode-toggle" aria-label="Формат ввода стопа">
          <button
            type="button"
            className={mode === 'percent' ? 'active' : ''}
            onClick={() => onModeChange('percent')}
          >
            %
          </button>
          <button
            type="button"
            className={mode === 'price' ? 'active' : ''}
            onClick={() => onModeChange('price')}
          >
            Цена
          </button>
        </div>
      </div>

      <div className="stop-loss-input-row">
        {mode === 'percent' ? (
          <AmountInput
            min={0}
            step={0.1}
            suffix="%"
            value={percent}
            onChange={onPercentChange}
          />
        ) : (
          <div className="input-shell">
            <input value={price} onChange={(event) => onPriceChange(event.target.value)} />
            <span>USDT</span>
          </div>
        )}
        <span className="price-percent danger">{formatSignedPercent(percentBadge, 2)}</span>
      </div>

      {mode === 'percent' && (
        <p className="stop-derived-price">Цена Stop Loss: {price || '0.00'} USDT</p>
      )}
      {error && <p className="stop-field-error">{error}</p>}
    </div>
  );
}

function PriceRow({
  label,
  onChange,
  percent,
  tone = 'default',
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  percent?: number;
  tone?: 'default' | 'danger' | 'success';
  value: string;
}) {
  return (
    <label className={`price-row ${percent === undefined ? 'entry' : 'with-percent'}`}>
      <span className="price-label">{label}</span>
      <span className="price-input-wrap">
        <input value={value} onChange={(event) => onChange(event.target.value)} />
        <span>USDT</span>
      </span>
      {percent !== undefined && (
        <span className={`price-percent ${tone}`}>{formatSignedPercent(percent, 2)}</span>
      )}
    </label>
  );
}

function MetricCard({
  icon,
  label,
  tooltip,
  value,
}: {
  icon: ReactNode;
  label: string;
  tooltip?: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <span className="mx-auto mb-2 inline-flex text-brand-600">{icon}</span>
      <p className="metric-label">
        <span>{label}</span>
        {tooltip && (
          <span className="metric-help" tabIndex={0} aria-label={tooltip}>
            ?
            <span className="metric-tooltip">{tooltip}</span>
          </span>
        )}
      </p>
      <p className="metric-value">{value}</p>
    </div>
  );
}

function RiskComparison({
  rewardDistancePercent,
  riskDistancePercent,
  rr,
}: {
  rewardDistancePercent: number;
  riskDistancePercent: number;
  rr: number;
}) {
  const safeRatio = Number.isFinite(rr) && rr > 0 ? rr : 0;
  const maxUnits = Math.max(1, safeRatio);
  const riskWidth = 100 / maxUnits;
  const rewardWidth = safeRatio > 0 ? (safeRatio / maxUnits) * 100 : 0;
  const riskPercentLabel = formatDistancePercent(riskDistancePercent);
  const rewardPercentLabel = formatDistancePercent(rewardDistancePercent);

  return (
    <div className="my-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
      <h3 className="mb-4 text-base font-black text-ink">Соотношение риска и прибыли</h3>
      <ComparisonBar
        color="brand"
        label={`Риск −${riskPercentLabel}`}
        width={riskWidth}
      />
      <ComparisonBar
        color="green"
        label={`Прибыль +${rewardPercentLabel}`}
        width={rewardWidth}
      />
      <p className="mt-3 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-bold text-ink/70">
        {safeRatio >= 1
          ? `Потенциальная прибыль в ${formatRatio(safeRatio)} раза больше риска: ${rewardPercentLabel} ÷ ${riskPercentLabel}.`
          : 'Потенциальная прибыль меньше риска.'}
      </p>
    </div>
  );
}

function ComparisonBar({
  color,
  label,
  width,
}: {
  color: 'brand' | 'green';
  label: string;
  width: number;
}) {
  return (
    <div className="comparison-bar-row">
      <span>{label}</span>
      <div className="comparison-track" aria-hidden="true">
        <span
          className={`comparison-fill ${color}`}
          style={{ width: `${clamp(width, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TradeMap({ calc, direction }: { calc: Calc; direction: Direction }) {
  const isLong = direction === 'LONG';
  const ordered = isLong
    ? [
        { label: 'Stop Loss', value: calc.sl, percent: -calc.riskDistancePercent, tone: 'danger' },
        { label: 'Entry', value: calc.entry, percent: 0, tone: 'brand' },
        { label: 'Take Profit', value: calc.tp, percent: calc.rewardDistancePercent, tone: 'success' },
      ]
    : [
        { label: 'Take Profit', value: calc.tp, percent: -calc.rewardDistancePercent, tone: 'success' },
        { label: 'Entry', value: calc.entry, percent: 0, tone: 'brand' },
        { label: 'Stop Loss', value: calc.sl, percent: calc.riskDistancePercent, tone: 'danger' },
      ];

  return (
    <section className="my-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-brand-800">
        <LineChart size={17} />
        Карта сделки
      </div>
      <div className="relative px-2 pb-2 pt-1">
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
          {ordered.map((point) => (
            <div key={point.label} className="min-w-0">
              <p className="truncate text-ink/75">{point.label}</p>
              <p className="mt-1 text-ink">{formatPrice(point.value)}</p>
              <p
                className={`mt-0.5 ${
                  point.tone === 'danger'
                    ? 'text-red-500'
                    : point.tone === 'success'
                      ? 'text-emerald-600'
                      : 'text-brand-700'
                }`}
              >
                {formatSignedPercent(point.percent)}
              </p>
            </div>
          ))}
        </div>
        <div className={`trade-line ${isLong ? 'long' : 'short'}`} aria-hidden="true">
          <span className="trade-dot danger" />
          <span className="trade-dot brand" />
          <span className="trade-dot success" />
        </div>
      </div>
    </section>
  );
}

function ScenarioCard({
  icon,
  text,
  title,
  tone,
  value,
}: {
  icon: ReactNode;
  text?: string;
  title: string;
  tone: 'danger' | 'success';
  value: string;
}) {
  return (
    <div className={`scenario-card ${tone}`}>
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p className="scenario-value">{value}</p>
        {text && <p className="scenario-text">{text}</p>}
      </div>
    </div>
  );
}

function StepCard({ icon, number, text }: { icon: ReactNode; number: string; text: string }) {
  return (
    <div className="step-card">
      <span className="step-number">{number}</span>
      <span className="text-brand-600">{icon}</span>
      <p>{text}</p>
    </div>
  );
}

function FaqCard({
  example,
  formula,
  title,
}: {
  example: ReactNode;
  formula: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
      <h3 className="text-lg font-black text-brand-800">{title}</h3>
      <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm font-black text-ink/70">
        {formula}
      </p>
      <p className="mt-2 text-sm font-semibold text-ink/60">Пример: {example}</p>
    </div>
  );
}

function FooterColumn({ links, title }: { links: string[]; title: string }) {
  return (
    <div>
      <h3 className="footer-title">{title}</h3>
      {links.map((link) => (
        <a key={link} href="#calculator" className="footer-link">
          {link}
        </a>
      ))}
    </div>
  );
}

function DecorativeChart() {
  const candles = Array.from({ length: 28 }, (_, index) => ({
    left: 34 + index * 2.35,
    top: 45 - Math.sin(index / 2) * 8 - index * 0.55,
    height: 18 + ((index * 7) % 16),
  }));

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[72%] opacity-80 md:block">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 820 300" fill="none">
        <path
          d="M12 222 C90 185 124 219 174 176 C222 135 258 195 314 158 C371 120 397 180 460 132 C520 86 565 150 630 101 C680 65 725 93 804 48"
          stroke="#9b7bf2"
          strokeWidth="2"
          opacity="0.34"
        />
        <path
          d="M12 236 C104 208 150 229 208 188 C266 146 286 210 356 165 C426 121 436 176 511 133 C590 86 632 130 804 61"
          stroke="#c4b4fa"
          strokeWidth="2"
          opacity="0.28"
        />
        {[120, 230, 340, 455, 575, 710, 805].map((cx, index) => (
          <circle key={cx} cx={cx} cy={[201, 169, 152, 140, 103, 82, 48][index]} r="6" fill="#9b7bf2" opacity="0.55" />
        ))}
      </svg>
      {candles.map((candle, index) => (
        <span
          key={index}
          className="hero-candle"
          style={{
            height: `${candle.height}px`,
            left: `${candle.left}%`,
            top: `${candle.top}%`,
          }}
        />
      ))}
    </div>
  );
}

function readHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .map((item, index) => normalizeHistoryItem(item, index))
      .filter((item): item is HistoryItem => item !== null && !isLegacySeededHistoryItem(item));

    return normalized;
  } catch {
    return [];
  }
}

function isLegacySeededHistoryItem(item: HistoryItem) {
  return item.id.startsWith('example-');
}

function normalizeHistoryItem(item: unknown, index: number): HistoryItem | null {
  if (!item || typeof item !== 'object') return null;

  const raw = item as Partial<HistoryItem>;
  const direction = isDirection(raw.direction) ? raw.direction : 'LONG';
  const fallbackSnapshot = snapshotFromHistoryDisplay(raw, direction);
  const snapshot = normalizeSnapshot(raw.snapshot, fallbackSnapshot);
  const itemDirection = isDirection(raw.direction) ? raw.direction : snapshot.direction;
  const displayCalc = calculateRiskValues(snapshot);
  const riskPercentOfDeposit =
    snapshot.deposit > 0 ? Math.max(0, (displayCalc.riskPerTrade / snapshot.deposit) * 100) : 0;

  return {
    id: typeof raw.id === 'string' ? raw.id : `history-${index}-${Date.now()}`,
    instrument: typeof raw.instrument === 'string' ? raw.instrument : 'CUSTOM',
    direction: itemDirection,
    risk: formatPercent(riskPercentOfDeposit),
    rr: `1 : ${formatRatio(displayCalc.rr)}`,
    position: formatMoney(displayCalc.positionSize),
    date: typeof raw.date === 'string' ? raw.date : formatDateLabel(new Date()),
    snapshot: {
      ...snapshot,
      direction: itemDirection,
    },
    summary: normalizeCalculationSummary(raw.summary, displayCalc),
  };
}

function normalizeSnapshot(
  snapshot: Partial<CalculationSnapshot> | undefined,
  fallback: CalculationSnapshot,
): CalculationSnapshot {
  const entryPrice = normalizePriceValue(snapshot?.entryPrice, fallback.entryPrice);
  const stopLoss = normalizePriceValue(snapshot?.stopLoss, fallback.stopLoss);

  return {
    deposit: normalizePositiveNumber(snapshot?.deposit, fallback.deposit),
    dailyRiskPercent: normalizeDailyRiskPercent(snapshot?.dailyRiskPercent, fallback.dailyRiskPercent),
    tradesPerDay: normalizeTradesPerDay(snapshot?.tradesPerDay, fallback.tradesPerDay),
    selectedLeverage: normalizeLeverage(snapshot?.selectedLeverage, fallback.selectedLeverage),
    direction: isDirection(snapshot?.direction) ? snapshot.direction : fallback.direction,
    entryPrice,
    stopPercent: normalizeStopPercent(snapshot?.stopPercent, fallback.stopPercent, entryPrice, stopLoss),
    stopInputMode: isStopInputMode(snapshot?.stopInputMode) ? snapshot.stopInputMode : fallback.stopInputMode,
    stopLoss,
    takeProfit: normalizePriceValue(snapshot?.takeProfit, fallback.takeProfit),
  };
}

function normalizeCalculationSummary(
  summary: Partial<CalculationSummary> | undefined,
  calc: Calc,
): CalculationSummary {
  return {
    leverage: normalizeLeverage(summary?.leverage, calc.selectedLeverage),
    entryAmount: normalizeNonNegativeNumber(summary?.entryAmount, calc.entryAmount),
    positionSize: normalizeNonNegativeNumber(summary?.positionSize, calc.positionSize),
    riskPerTrade: normalizeNonNegativeNumber(summary?.riskPerTrade, calc.riskPerTrade),
    dailyRiskAmount: normalizeNonNegativeNumber(summary?.dailyRiskAmount, calc.dailyRiskAmount),
    rr: normalizeNonNegativeNumber(summary?.rr, calc.rr),
  };
}

function snapshotFromHistoryDisplay(
  item: Partial<HistoryItem>,
  direction: Direction,
): CalculationSnapshot {
  const deposit = 1000;
  const tradesPerDay = 3;
  const riskPercentPerTrade = clamp(parseDisplayNumber(item.risk) || 1, 0.1, 100);
  const dailyRiskPercent = clamp(riskPercentPerTrade * tradesPerDay, 0.1, 15);
  const riskAmount = (deposit * dailyRiskPercent) / 100 / tradesPerDay;
  const positionSize = parseDisplayNumber(item.position) || 1000;
  const rr = parseRatioDisplay(item.rr) || 2;
  const stopPercent = positionSize > 0 ? (riskAmount / positionSize) * 100 : 2;
  const fallbackLeverage = deposit > 0 ? positionSize / deposit : 1;
  const entry = 100;
  const stopDistance = (entry * stopPercent) / 100;
  const rewardDistance = stopDistance * rr;

  return {
    deposit,
    dailyRiskPercent,
    tradesPerDay,
    selectedLeverage: roundLeverageUp(fallbackLeverage),
    direction,
    entryPrice: formatInputPrice(entry),
    stopPercent,
    stopInputMode: 'percent',
    stopLoss: formatInputPrice(direction === 'LONG' ? entry - stopDistance : entry + stopDistance),
    takeProfit: formatInputPrice(direction === 'LONG' ? entry + rewardDistance : entry - rewardDistance),
  };
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeDailyRiskPercent(value: unknown, fallback: number) {
  const percent = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return clamp(percent, 0.1, 15);
}

function normalizeTradesPerDay(value: unknown, fallback: number) {
  const trades = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(1, Math.round(trades));
}

function normalizeStopPercent(
  value: unknown,
  fallback: number,
  entryPrice: string,
  stopLoss: string,
) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const calculated = getStopPercentFromPrices(entryPrice, stopLoss);
  return calculated && calculated > 0 ? calculated : fallback;
}

function normalizeLeverage(value: unknown, fallback: number) {
  const leverage = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.round(clamp(leverage, 1, 100));
}

function roundLeverageUp(value: number) {
  if (!Number.isFinite(value) || value <= 1) return 1;
  return getLeverageChoice(value);
}

function normalizePriceValue(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  return Number.isFinite(parsePrice(value)) && parsePrice(value) > 0 ? value : fallback;
}

function parseDisplayNumber(value: unknown) {
  if (typeof value !== 'string') return 0;
  const match = value.replace(/\s/g, '').replace(',', '.').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function parseRatioDisplay(value: unknown) {
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(',', '.');
  const ratioMatch = normalized.match(/:\s*(\d+(\.\d+)?)/);
  if (ratioMatch) return Number(ratioMatch[1]);
  return parseDisplayNumber(value);
}

function isDirection(value: unknown): value is Direction {
  return value === 'LONG' || value === 'SHORT';
}

function isStopInputMode(value: unknown): value is StopInputMode {
  return value === 'percent' || value === 'price';
}

function getStopLossFieldError(calc: Calc, direction: Direction, stopPercent: number) {
  if (stopPercent <= 0) return 'Процент Stop Loss должен быть больше 0.';
  if (!Number.isFinite(calc.entry) || calc.entry <= 0 || !Number.isFinite(calc.sl) || calc.sl <= 0) {
    return '';
  }
  if (direction === 'LONG' && calc.sl >= calc.entry) return 'Для LONG Stop Loss должен быть ниже Entry.';
  if (direction === 'SHORT' && calc.sl <= calc.entry) return 'Для SHORT Stop Loss должен быть выше Entry.';
  return '';
}

function parsePrice(value: string) {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getStopLossFromPercent(entryPrice: string, direction: Direction, percent: number) {
  const entry = parsePrice(entryPrice);
  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(percent) || percent < 0) return '';
  const multiplier = direction === 'LONG' ? 1 - percent / 100 : 1 + percent / 100;
  return formatInputPrice(entry * multiplier);
}

function getStopPercentFromPrices(entryPrice: string, stopLoss: string) {
  const entry = parsePrice(entryPrice);
  const sl = parsePrice(stopLoss);
  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(sl) || sl <= 0) return null;
  return roundInputNumber((Math.abs(entry - sl) / entry) * 100);
}

function roundInputNumber(value: number) {
  return Math.round(value * 10000) / 10000;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatNumberInputValue(value: number) {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? value.toString() : value.toString();
}

function formatMoney(value: number) {
  return `${Math.round(Number.isFinite(value) ? value : 0).toLocaleString('ru-RU')}$`;
}

function formatPreciseMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safeValue * 100) / 100;
  const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.001;
  return `${rounded.toLocaleString('ru-RU', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}$`;
}

function formatApproxPreciseMoney(value: number) {
  return `~${formatPreciseMoney(value)}`;
}

function formatRatio(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0.0';
  return value.toFixed(1);
}

function formatSelectedLeverage(value: number) {
  if (!Number.isFinite(value) || value <= 1) return '1x';
  return `${Math.round(value)}x`;
}

function getLeverageChoice(value: number) {
  if (!Number.isFinite(value) || value <= 1) return 1;
  return Math.max(1, Math.round(value));
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return '0.0000';
  return value.toFixed(4);
}

function formatInputPrice(value: number) {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(2);
}

function formatSignedPercent(value: number, digits = 1) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

function formatDistancePercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('ru-RU')}%`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return Number.isInteger(value) ? `${value}%` : `${Number(value.toFixed(2))}%`;
}

function makeId() {
  return window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}`;
}

function formatDateLabel(date: Date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  if (isSameDate(date, now)) return `Сегодня, ${time}`;
  if (isSameDate(date, yesterday)) return `Вчера, ${time}`;

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default App;
