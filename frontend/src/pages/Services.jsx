import { useEffect, useState } from 'react';
import { Plus, Wrench, Trash2, Edit, Clock, IndianRupee } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ServiceForm from '../components/services/ServiceForm';
import { formatINR } from '../utils/currency';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState(null);

  const fetchData = () => {
    setLoading(true);
    api.get('/services').then(({ data }) => setServices(data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    await api.delete(`/services/${id}`);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditService(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> Add Service
        </button>
      </div>

      {loading ? <LoadingSpinner /> : services.length === 0 ? (
        <EmptyState icon={Wrench} title="No services added" description="Add services your business offers." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s._id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-slate-800">{s.name}</p>
                <div className="flex gap-1">
                  <button onClick={() => { setEditService(s); setShowModal(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(s._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              {s.description && <p className="text-xs text-slate-500 mb-3">{s.description}</p>}
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1"><Clock size={14} /> {s.duration} min</span>
                <span className="flex items-center gap-1 font-semibold text-primary-600"><IndianRupee size={14} /> {formatINR(s.price).replace(/^₹/, '')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editService ? 'Edit Service' : 'Add Service'}>
        <ServiceForm service={editService} onSuccess={() => { setShowModal(false); fetchData(); }} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}
