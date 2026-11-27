import {openDatabase} from './database.mjs';
import {configuration} from './security.mjs';
import {createApp} from './app.mjs';
process.umask(0o077);
const config=configuration();const db=openDatabase(config.file);const app=createApp(db,config);
app.on('error',error=>{console.error('Server gagal dijalankan:',error.code??error.message);db.close();process.exitCode=1;});
app.listen(config.port,'127.0.0.1',()=>console.log(`BBI Server tersedia di ${config.origin}. Database permanen aktif.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{app.close(()=>{db.close();process.exit(0);});app.closeIdleConnections();});
