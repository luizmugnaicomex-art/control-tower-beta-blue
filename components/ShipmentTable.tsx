import React from 'react';
import { Shipment, SortConfig } from '../types';
import { currencyFormatter } from '../utils/formatters';

interface ShipmentTableProps {
    shipments: Shipment[];
    sortConfig: SortConfig;
    onSort: (config: SortConfig) => void;
    searchTerm: string;
    onSearch: (term: string) => void;
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    subtitle?: string;
}

const TableHeader: React.FC<{
    sortKey: keyof Shipment;
    label: string;
    sortConfig: SortConfig;
    onSort: (config: SortConfig) => void;
}> = ({ sortKey, label, sortConfig, onSort }) => {
    const isSorted = sortConfig.key === sortKey;
    const direction = isSorted ? sortConfig.direction : undefined;

    const handleClick = () => {
        const newDirection =
            isSorted && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        onSort({ key: sortKey, direction: newDirection });
    };

    const icon = isSorted
        ? direction === 'asc'
            ? 'expand_less'
            : 'expand_more'
        : 'unfold_more';

    return (
        <th
            className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none group"
            onClick={handleClick}
        >
            <span className="flex items-center">
                {label}
                <span
                    className={`material-icons ml-1 text-xs ${
                        isSorted
                            ? 'text-red-600'
                            : 'text-gray-400 group-hover:text-red-600'
                    }`}
                >
                    {icon}
                </span>
            </span>
        </th>
    );
};

const ShipmentTable: React.FC<ShipmentTableProps> = ({
    shipments,
    sortConfig,
    onSort,
    searchTerm,
    onSearch,
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    subtitle,
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalItems);

    const formatDate = (date: Date | null) =>
        date ? date.toLocaleDateString() : 'N/A';

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {/* Header + search */}
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                <div className="w-full sm:w-auto">
                    <h3 className="text-base font-semibold text-gray-800">
                        Shipment Details
                    </h3>
                    {subtitle && (
                        <p className="text-xs text-red-600 font-medium mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className="relative w-full sm:w-72">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        search
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => {
                            onSearch(e.target.value);
                            onPageChange(1);
                        }}
                        placeholder="Search container, carrier, vessel..."
                        className="pl-9 pr-4 py-2 w-full rounded-md border border-gray-300 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <TableHeader
                                sortKey="containerNumber"
                                label="Container"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="shipper"
                                label="Shipper"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="carrier"
                                label="Carrier"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="vesselName"
                                label="Vessel"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="containerType"
                                label="Type"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="incoterm"
                                label="Incoterm"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="madeRomaneio"
                                label="Romaneio"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="cargo"
                                label="Cargo"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="ata"
                                label="ATA"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="deliveryByd"
                                label="Delivery Date"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="clientDeliveryVariance"
                                label="Variance (Days)"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="totalClearanceTime"
                                label="Clearance (Days)"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="detentionRisk"
                                label="Detention (Days)"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                            <TableHeader
                                sortKey="demurrageCost"
                                label="Demurrage"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {shipments.length > 0 ? (
                            shipments.map((s, index) => {
                                const variance = s.clientDeliveryVariance;
                                let varianceClass = 'text-gray-700';
                                if (variance !== null) {
                                    varianceClass =
                                        variance > 0
                                            ? 'text-red-600 font-semibold'
                                            : 'text-green-600 font-semibold';
                                }

                                const detentionRisk = s.detentionRisk;
                                let detentionRiskClass = 'text-gray-700';
                                if (detentionRisk !== null) {
                                    detentionRiskClass =
                                        detentionRisk > 0
                                            ? 'text-red-600 font-semibold'
                                            : 'text-green-600 font-semibold';
                                }

                                return (
                                    <tr
                                        key={index}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                            {s.containerNumber || '-'}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">
                                            {s.shipper}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {s.carrier}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {s.vesselName || '-'}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {s.containerType || '-'}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {s.incoterm || '-'}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-xs">
                                            <span className={`px-2 py-1 rounded-full font-black text-[10px] ${
                                                s.madeRomaneio === 'YES' || s.madeRomaneio === 'LCL'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {s.madeRomaneio || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {s.cargo}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {formatDate(s.ata)}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {formatDate(s.deliveryByd)}
                                        </td>
                                        <td
                                            className={`px-6 py-3 whitespace-nowrap text-sm ${varianceClass}`}
                                        >
                                            {variance !== null
                                                ? variance > 0
                                                    ? `+${variance}`
                                                    : variance
                                                : 'N/A'}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {s.totalClearanceTime ?? 'N/A'}
                                        </td>
                                        <td
                                            className={`px-6 py-3 whitespace-nowrap text-sm ${detentionRiskClass}`}
                                        >
                                            {detentionRisk !== null
                                                ? detentionRisk > 0
                                                    ? `+${detentionRisk}`
                                                    : detentionRisk
                                                : 'N/A'}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                                            {s.demurrageCost > 0
                                                ? currencyFormatter.format(
                                                      s.demurrageCost
                                                  )
                                                : '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={13}
                                    className="text-center py-6 text-sm text-gray-500"
                                >
                                    No matching shipments found for the current
                                    filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <nav
                className="p-4 flex items-center justify-between border-t border-gray-200 bg-gray-50"
                aria-label="Pagination"
            >
                <div className="hidden sm:block">
                    <p className="text-xs text-gray-600">
                        Showing{' '}
                        <span className="font-medium">
                            {totalItems > 0 ? startItem : 0}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                            {totalItems > 0 ? endItem : 0}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">{totalItems}</span>{' '}
                        results
                    </p>
                </div>
                <div className="flex-1 flex justify-between sm:justify-end gap-2">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default ShipmentTable;
