
import React from 'react';

interface DashboardFiltersProps {
    carriers: string[];
    analysts: string[];
    cargos: string[];
    containerTypes: string[];
    incoterms: string[];
    romaneioStatuses: string[];
    years: number[];
    selectedCarriers: string[];
    selectedAnalysts: string[];
    selectedCargos: string[];
    selectedContainerTypes: string[];
    selectedIncoterms: string[];
    selectedRomaneioStatuses: string[];
    selectedYear: string;
    selectedPeriod: string;
    selectedMonth: string;
    onCarrierChange: (carriers: string[]) => void;
    onAnalystChange: (analysts: string[]) => void;
    onCargoChange: (cargos: string[]) => void;
    onContainerTypeChange: (types: string[]) => void;
    onIncotermChange: (incoterms: string[]) => void;
    onRomaneioStatusChange: (statuses: string[]) => void;
    onYearChange: (year: string) => void;
    onPeriodChange: (period: string) => void;
    onMonthChange: (month: string) => void;
    onReset: () => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
    carriers,
    analysts,
    cargos,
    containerTypes,
    incoterms,
    romaneioStatuses,
    years,
    selectedCarriers,
    selectedAnalysts,
    selectedCargos,
    selectedContainerTypes,
    selectedIncoterms,
    selectedRomaneioStatuses,
    selectedYear,
    selectedPeriod,
    selectedMonth,
    onCarrierChange,
    onAnalystChange,
    onCargoChange,
    onContainerTypeChange,
    onIncotermChange,
    onRomaneioStatusChange,
    onYearChange,
    onPeriodChange,
    onMonthChange,
    onReset,
}) => {
    const handleMultiSelectChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
        setter: (values: string[]) => void
    ) => {
        const options = Array.from(
            e.target.selectedOptions,
            (option: HTMLOptionElement) => option.value
        );
        setter(options);
    };

    const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ];

    const selectBaseClasses =
        'w-full rounded-md border border-gray-300 shadow-sm text-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900';

    // Count how many filters are effectively active
    const activeFiltersCount =
        (selectedCarriers.length ? 1 : 0) +
        (selectedAnalysts.length ? 1 : 0) +
        (selectedCargos.length ? 1 : 0) +
        (selectedContainerTypes.length ? 1 : 0) +
        (selectedIncoterms.length ? 1 : 0) +
        (selectedRomaneioStatuses.length ? 1 : 0) +
        (selectedYear !== 'all' ? 1 : 0) +
        (selectedPeriod !== 'all' && selectedYear !== 'all' ? 1 : 0) +
        (selectedMonth !== 'all' ? 1 : 0);

    return (
        <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 mb-2">
            {/* Top bar: title + active filters + reset */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-sm text-red-600">
                            tune
                        </span>
                        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                            Global Filters
                        </h2>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                        Ajuste ano, período, mês e players para ler o desempenho no recorte
                        certo (carrier, analista, incoterm, tipo de contêiner, etc.).
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-700">
                        <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                        {activeFiltersCount > 0 ? (
                            <>
                                <span className="font-semibold mr-1">
                                    {activeFiltersCount}
                                </span>
                                filtros ativos
                            </>
                        ) : (
                            'Nenhum filtro ativo'
                        )}
                    </div>

                    <button
                        onClick={onReset}
                        className="inline-flex items-center px-3 py-1.5 bg-white text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-red-400 transition-colors shadow-sm"
                    >
                        <span className="material-icons mr-1 text-sm text-gray-500">
                            refresh
                        </span>
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* Time filters row */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label
                        htmlFor="yearFilter"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Year
                    </label>
                    <select
                        id="yearFilter"
                        value={selectedYear}
                        onChange={e => {
                            onYearChange(e.target.value);
                            if (e.target.value === 'all') {
                                onPeriodChange('all');
                            }
                        }}
                        className={selectBaseClasses}
                    >
                        <option value="all">All Years</option>
                        {years.map(y => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="periodFilter"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Period
                    </label>
                    <select
                        id="periodFilter"
                        value={selectedPeriod}
                        onChange={e => onPeriodChange(e.target.value)}
                        disabled={selectedYear === 'all'}
                        className={`${selectBaseClasses} disabled:bg-gray-100 disabled:text-gray-400`}
                    >
                        <option value="all">Full Year</option>
                        <option value="H1">1st Half (H1)</option>
                        <option value="H2">2nd Half (H2)</option>
                        <option value="Q1">Q1</option>
                        <option value="Q2">Q2</option>
                        <option value="Q3">Q3</option>
                        <option value="Q4">Q4</option>
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="monthFilter"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Month
                    </label>
                    <select
                        id="monthFilter"
                        value={selectedMonth}
                        onChange={e => onMonthChange(e.target.value)}
                        className={selectBaseClasses}
                    >
                        <option value="all">All Months</option>
                        {months.map((m, index) => (
                            <option key={index} value={index}>
                                {m}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Entity filters grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                    <label
                        htmlFor="carrierFilter"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Carrier
                    </label>
                    <select
                        id="carrierFilter"
                        multiple
                        value={selectedCarriers}
                        onChange={e => handleMultiSelectChange(e, onCarrierChange)}
                        className={selectBaseClasses}
                        style={{ height: '110px' }}
                    >
                        {carriers.map(c => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                    {selectedCarriers.length > 0 && (
                        <p className="mt-1 text-[11px] text-gray-500">
                            {selectedCarriers.length} selecionado(s)
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="analystFilter"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Analyst
                    </label>
                    <select
                        id="analystFilter"
                        multiple
                        value={selectedAnalysts}
                        onChange={e => handleMultiSelectChange(e, onAnalystChange)}
                        className={selectBaseClasses}
                        style={{ height: '110px' }}
                    >
                        {analysts.map(a => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                    {selectedAnalysts.length > 0 && (
                        <p className="mt-1 text-[11px] text-gray-500">
                            {selectedAnalysts.length} selecionado(s)
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="cargoFilter"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Cargo
                    </label>
                    <select
                        id="cargoFilter"
                        multiple
                        value={selectedCargos}
                        onChange={e => handleMultiSelectChange(e, onCargoChange)}
                        className={selectBaseClasses}
                        style={{ height: '110px' }}
                    >
                        {cargos.map(c => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                    {selectedCargos.length > 0 && (
                        <p className="mt-1 text-[11px] text-gray-500">
                            {selectedCargos.length} selecionado(s)
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="containerTypeFilter"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Container Type
                    </label>
                    <select
                        id="containerTypeFilter"
                        multiple
                        value={selectedContainerTypes}
                        onChange={e =>
                            handleMultiSelectChange(e, onContainerTypeChange)
                        }
                        className={selectBaseClasses}
                        style={{ height: '110px' }}
                    >
                        {containerTypes.map(t => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                    {selectedContainerTypes.length > 0 && (
                        <p className="mt-1 text-[11px] text-gray-500">
                            {selectedContainerTypes.length} selecionado(s)
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="incotermFilter"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Incoterm
                    </label>
                    <select
                        id="incotermFilter"
                        multiple
                        value={selectedIncoterms}
                        onChange={e => handleMultiSelectChange(e, onIncotermChange)}
                        className={selectBaseClasses}
                        style={{ height: '110px' }}
                    >
                        {incoterms.map(t => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                    {selectedIncoterms.length > 0 && (
                        <p className="mt-1 text-[11px] text-gray-500">
                            {selectedIncoterms.length} selecionado(s)
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="romaneioFilter"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Romaneio Status
                    </label>
                    <select
                        id="romaneioFilter"
                        multiple
                        value={selectedRomaneioStatuses}
                        onChange={e => handleMultiSelectChange(e, onRomaneioStatusChange)}
                        className={selectBaseClasses}
                        style={{ height: '110px' }}
                    >
                        {romaneioStatuses.map(s => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    {selectedRomaneioStatuses.length > 0 && (
                        <p className="mt-1 text-[11px] text-gray-500">
                            {selectedRomaneioStatuses.length} selecionado(s)
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardFilters;