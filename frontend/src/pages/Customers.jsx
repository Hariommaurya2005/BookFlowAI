import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Trash2, Edit, Eye, Sparkles } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CustomerForm from '../components/customers/CustomerForm';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const fetchData = () => {
    setLoading(true);
    api.get('/customers', { params: { search } })
      .then(({ data }) => setCustomers(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    await api.delete(`/customers/${id}`);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" onClick={() => { setEditCustomer(null); setShowModal(true); }} className="btn-primary w-full sm:w-auto">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : customers.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" description="Add your first customer to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
            <caption className="sr-only">Customer directory and account actions</caption>
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Total Bookings</th>
                <th className="px-4 py-3 font-medium">Last Visit</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.totalBookings}</td>
                  <td className="px-4 py-3 text-slate-600">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title={`Generate AI customer summary for ${c.name}`}
                        aria-label={`Generate AI customer summary for ${c.name}`}
                        onClick={() => navigate(`/customers/${c._id}`, { state: { openCustomerSummary: true } })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary-100 bg-primary-50 px-2 py-1.5 text-xs font-bold text-primary-700 transition-colors hover:border-primary-200 hover:bg-primary-100"
                      ><Sparkles size={14} /><span>AI Summary</span></button>
                      <Link to={`/customers/${c._id}`} title={`View ${c.name}`} aria-label={`View ${c.name}`} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><Eye size={15} /></Link>
                      <button type="button" title={`Edit ${c.name}`} onClick={() => { setEditCustomer(c); setShowModal(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><Edit size={15} /></button>
                      <button type="button" title={`Delete ${c.name}`} onClick={() => handleDelete(c._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editCustomer ? 'Edit Customer' : 'Add Customer'}>
        <CustomerForm customer={editCustomer} onSuccess={() => { setShowModal(false); fetchData(); }} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}
