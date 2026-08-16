async function test() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'encargado@test.com', password: '123456' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;
    const branchId = loginData.data.user.branchId;
    console.log('Token:', token.substring(0, 20) + '...');
    console.log('Branch:', branchId);

    // 2. Fetch products
    const productsRes = await fetch(`http://localhost:4000/api/products?branchId=${branchId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const productsData = await productsRes.json();
    console.log('Products:', JSON.stringify(productsData, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
