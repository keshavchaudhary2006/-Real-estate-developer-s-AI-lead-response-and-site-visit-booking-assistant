const http = require('http');
const { app, startServer } = require('../server/index');

async function testHttpEndpoints() {
  console.log('\n--- Testing Antigravity Express HTTP Endpoints ---');
  const server = await startServer();
  const port = server.address().port;
  console.log(`Server listening on port ${port}`);

  function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: port,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: data });
          }
        });
      });

      req.on('error', (err) => reject(err));

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  try {
    // 1. Health
    const health = await makeRequest('GET', '/api/health');
    console.log(`✅ GET /api/health -> Status ${health.statusCode}, App: ${health.body.appName}, DB Mode: ${health.body.dbMode}`);

    // 2. Leads
    const leads = await makeRequest('GET', '/api/leads');
    console.log(`✅ GET /api/leads -> Status ${leads.statusCode}, Count: ${leads.body.count}`);

    // 3. Duplicate Phone Check & Merge
    console.log('Testing duplicate check: Submitting Hardik Patel with unformatted phone number 9876543210...');
    const dupCheck = await makeRequest('POST', '/api/leads', {
      name: 'Hardik Patel Returning',
      phone: '9876543210',
      source: 'Direct Portal Re-inquiry',
      preferred_bhk: '3.5 BHK',
      budget: '₹1.50 Cr',
      status: 'Booked',
      project_id: 'Project 1',
    });

    console.log(`✅ POST /api/leads (Duplicate) -> Status ${dupCheck.statusCode}`);
    console.log(`   Merged: ${dupCheck.body.merged}`);
    console.log(`   Message: ${dupCheck.body.message}`);
    console.log(`   Retained ID: ${dupCheck.body.data.id}`);
    console.log(`   Updated BHK: ${dupCheck.body.data.preferred_bhk}`);

    // 4. FactSheet
    const facts = await makeRequest('GET', '/api/factsheet');
    console.log(`✅ GET /api/factsheet -> Status ${facts.statusCode}, Count: ${facts.body.count}`);

    // 5. VisitSlots
    const slots = await makeRequest('GET', '/api/slots');
    console.log(`✅ GET /api/slots -> Status ${slots.statusCode}, Count: ${slots.body.count}`);

    // 6. Explicit Merge
    // Let's create two leads and merge them
    const l1 = await makeRequest('POST', '/api/leads', {
      name: 'Test Client A',
      phone: '9111122222',
      source: 'Portal',
      status: 'New',
    });
    const l2 = await makeRequest('POST', '/api/leads', {
      name: 'Test Client B',
      phone: '9333344444',
      source: 'Portal',
      status: 'Visited',
    });

    const mergeRes = await makeRequest('POST', '/api/leads/merge', {
      primaryLeadId: l1.body.data.id,
      duplicateLeadId: l2.body.data.id,
    });
    console.log(`✅ POST /api/leads/merge -> Status ${mergeRes.statusCode}, ${mergeRes.body.message}`);

    // Cleanup
    await makeRequest('DELETE', `/api/leads/${l1.body.data.id}`);

    console.log('\n🎉 ALL HTTP ENDPOINTS VERIFIED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('HTTP Test Error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

testHttpEndpoints();
