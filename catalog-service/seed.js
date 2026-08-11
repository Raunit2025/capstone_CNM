db = db.getSiblingDB('catalog_db');

db.cakes.insertMany([
  {
    name: "Classic Chocolate Truffle",
    description: "A rich, dense chocolate cake covered in smooth chocolate ganache.",
    category: "Chocolate",
    price: 135.00,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Strawberry Shortcake",
    description: "Light vanilla sponge layered with fresh strawberries and whipped cream.",
    category: "Fruit",
    price: 228.50,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Vanilla Bean Dream",
    description: "Light and fluffy vanilla sponge made with real Madagascar vanilla beans.",
    category: "Classic",
    price: 125.50,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Red Velvet Capstone",
    description: "Cloud-native red velvet cake layered with sweet cream cheese frosting.",
    category: "Specialty",
    price: 245.99,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Vegan Lemon Blueberry",
    description: "Zesty lemon cake studded with fresh blueberries, completely plant-based.",
    category: "Vegan",
    price: 232.00,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Black Forest Gateau",
    description: "Layers of chocolate sponge, cherry liqueur, whipped cream, and tart cherries.",
    category: "Chocolate",
    price: 240.00,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Mango Passion Delight",
    description: "Tropical mango mousse cake with a passionfruit glaze.",
    category: "Fruit",
    price: 238.50,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1502004960551-dc67f7c24cb3?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Coffee Walnut Sponge",
    description: "Classic British sponge cake infused with espresso and topped with walnuts.",
    category: "Classic",
    price: 322.00,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Hazelnut Praline Crunch",
    description: "Premium hazelnut cake with a crispy praline base and mirror glaze.",
    category: "Specialty",
    price: 255.00,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Mini Cupcake Assortment",
    description: "A dozen bite-sized cupcakes in assorted classic flavors.",
    category: "Classic",
    price: 115.00,
    availability: true,
    imageReference: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=500&q=80",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);