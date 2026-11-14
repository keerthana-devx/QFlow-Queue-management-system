const styles = {
  waiting:   'bg-amber-50  text-amber-700  border border-amber-200',
  assigned:  'bg-blue-50   text-blue-700   border border-blue-200',
  called:    'bg-purple-50 text-purple-700 border border-purple-200',
  serving:   'bg-green-50  text-green-700  border border-green-200',
  completed: 'bg-gray-100  text-gray-500   border border-gray-200',
  cancelled: 'bg-red-50    text-red-500    border border-red-200',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[status] || styles.waiting}`}>
      {status}
    </span>
  );
}
