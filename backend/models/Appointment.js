const mongoose = require('mongoose');

// Department prefix map for smart token codes
const DEPT_PREFIX = {
  'General Medicine': 'GEN',
  'Cardiology':       'CAR',
  'Dental':           'DEN',
  'Dermatology':      'DRM',
  'Orthopaedics':     'ORT',
  'Pharmacy':         'PHR',
  'Paediatrics':      'PAE',
  'Gynaecology':      'GYN',
  'Ophthalmology':    'OPH',
  'ENT':              'ENT',
};

const appointmentSchema = new mongoose.Schema({
  managerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  doctorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },

  // Smart token: GEN-001, DEN-003 etc.
  tokenCode:    { type: String, required: true },
  tokenNumber:  { type: Number, required: true },

  // Patient info (no sensitive medical records)
  patientName:  { type: String, required: true, trim: true },
  phone:        { type: String, default: '' },
  department:   { type: String, required: true },
  purpose:      { type: String, required: true },
  notes:        { type: String, default: '' },
  preferredDoctor: { type: String, default: '' },

  // Workflow status
  status: {
    type: String,
    enum: ['waiting', 'assigned', 'called', 'serving', 'completed', 'cancelled'],
    default: 'waiting'
  },

  // Timestamps
  issuedAt:     { type: Date, default: Date.now },
  calledAt:     { type: Date },
  servingAt:    { type: Date },
  completedAt:  { type: Date },
  cancelledAt:  { type: Date },

  // Estimated wait in minutes at time of registration
  estimatedWait: { type: Number, default: 0 }
}, { timestamps: true });

appointmentSchema.index({ managerId: 1, issuedAt: -1 });
appointmentSchema.index({ managerId: 1, status: 1 });
appointmentSchema.index({ managerId: 1, department: 1 });

appointmentSchema.statics.getPrefixForDept = function(dept) {
  return DEPT_PREFIX[dept] || dept.substring(0, 3).toUpperCase();
};

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.DEPT_PREFIX = DEPT_PREFIX;
