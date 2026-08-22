import os from 'os';

/**
 * Returns the local IPv4 address of the host machine (e.g. 192.168.1.100)
 */
export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    for (const net of interfaces[interfaceName]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

export function printNetworkBanner(port) {
  const localIp = getLocalIpAddress();
  console.log('\n' + '='.repeat(68));
  console.log('  🏥  PHARMACONNECT - PHARMACY POS & STOCK MANAGEMENT SYSTEM');
  console.log('='.repeat(68));
  console.log(`  ➜ Local Host:    http://localhost:${port}`);
  console.log(`  ➜ Local Network: http://${localIp}:${port}  <-- Access on Mobile/LAN`);
  console.log('='.repeat(68));
  console.log('  💡 Tip: Connect smartphones or extra PCs to the same Wi-Fi');
  console.log('         and open the Local Network URL to scan & sell!\n');
}
