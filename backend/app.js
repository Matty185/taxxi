const authRoutes = require('./routes/AuthRoutes');
const rideRoutes = require('./routes/RideRoutes');
const driverRoutes = require('./routes/DriverRoutes');
const panicRoutes = require('./routes/PanicRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/panic', panicRoutes); 