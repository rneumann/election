import React from 'react';
import AuditLogTable from './AuditLogTable';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* ... Navigation oder Header ... */}
      
      <main className="max-w-7xl mx-auto">
        <AuditLogTable />
      </main>
    </div>
  );
};

export default AdminDashboard;