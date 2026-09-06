async function testCreateProduct() {
  try {
    // Primero, login para obtener token
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'arieljsc2000@gmail.com',
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    console.log("Login res:", loginData);
    
    if (!loginData.data || !loginData.data.token) {
      console.log("Login failed!");
      return;
    }

    const token = loginData.data.token;
    console.log("Token obtenido:", token.substring(0, 20) + '...');

    // Obtener categorias
    const catRes = await fetch('http://localhost:4000/api/categories', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const catData = await catRes.json();
    
    const categories = catData.data;
    if (categories.length === 0) {
      console.log("No hay categorias. Abortando.");
      return;
    }
    const catId = categories[0].id;
    console.log("Usando categoria:", catId);

    // Payload de creacion
    const payload = {
      sku: "BEB-",
      name: "Prueba Test",
      categoryId: catId,
      costPrice: 0.5,
      sellingPrice: 1.5,
      initialStock: 0,
      minStock: 5,
      maxStock: 20,
      unitOfMeasure: "UNIDAD",
      isTracked: true,
      description: ""
    };

    console.log("Enviando payload:", JSON.stringify(payload, null, 2));

    const createRes = await fetch('http://localhost:4000/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const createData = await createRes.json();

    if (!createRes.ok) {
      console.log("SERVER ERROR:", JSON.stringify(createData, null, 2));
    } else {
      console.log("SUCCESS:", createData);
    }
  } catch (error) {
    console.log("NETWORK ERROR:", error.message);
  }
}

testCreateProduct();
