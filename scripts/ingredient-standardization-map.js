#!/usr/bin/env node

/**
 * Ingredient Standardization Map
 * Maps AI-generated ingredient names to standardized canonical names with proper units
 * Based on analysis of 750+ ingredients from deduped_ingredients_v6.csv
 */

// CANONICAL INGREDIENT MAPPING
// This maps various AI-generated names to our standardized canonical names
export const INGREDIENT_STANDARDIZATION_MAP = {
  // PRODUCE - Standardize to singular, specific forms
  "tomato": "Tomatoes",
  "tomatoes": "Tomatoes", 
  "cherry tomato": "Cherry Tomatoes",
  "cherry tomatoes": "Cherry Tomatoes",
  "roma tomato": "Roma Tomatoes",
  "roma tomatoes": "Roma Tomatoes",
  "grape tomatoes": "Cherry Tomatoes", // Map to cherry tomatoes
  
  "bell pepper": "Red Bell Pepper", // Default to red
  "bell peppers": "Red Bell Pepper",
  "red bell pepper": "Red Bell Pepper",
  "red bell peppers": "Red Bell Pepper", 
  "yellow bell pepper": "Yellow Bell Pepper",
  "yellow bell peppers": "Yellow Bell Pepper",
  "green bell pepper": "Green Bell Pepper",
  "green bell peppers": "Green Bell Pepper",
  
  "onion": "Yellow Onion", // Default to yellow
  "onions": "Yellow Onion",
  "yellow onion": "Yellow Onion",
  "yellow onions": "Yellow Onion",
  "red onion": "Red Onion", 
  "red onions": "Red Onion",
  "white onion": "White Onion",
  "white onions": "White Onion",
  
  "lemon": "Lemons",
  "lemons": "Lemons",
  "lime": "Limes", 
  "limes": "Limes",
  "orange": "Oranges",
  "oranges": "Oranges",
  
  "carrot": "Carrots",
  "carrots": "Carrots",
  "cucumber": "Cucumber",
  "cucumbers": "Cucumber",
  "english cucumber": "English Cucumber",
  
  "avocado": "Avocado",
  "avocados": "Avocado",
  
  // HERBS - Standardize to bunch
  "fresh parsley": "Parsley",
  "parsley": "Parsley",
  "fresh cilantro": "Cilantro", 
  "cilantro": "Cilantro",
  "fresh basil": "Basil",
  "basil": "Basil",
  "fresh thyme": "Thyme",
  "thyme": "Thyme",
  "fresh oregano": "Oregano",
  "oregano": "Oregano",
  "fresh mint": "Mint",
  "mint": "Mint",
  "fresh chives": "Chives",
  "chives": "Chives",
  "scallion": "Scallions",
  "scallions": "Scallions",
  "green onion": "Scallions",
  "green onions": "Scallions",
  
  // SPICES & SEASONINGS - Standardize units and names
  "black pepper": "Black Pepper",
  "ground black pepper": "Black Pepper",
  "freshly ground black pepper": "Black Pepper",
  "white pepper": "White Pepper", 
  "ground white pepper": "White Pepper",
  "red pepper flakes": "Red Pepper Flakes",
  "crushed red pepper": "Red Pepper Flakes",
  "cayenne pepper": "Cayenne Pepper",
  "ground cayenne": "Cayenne Pepper",
  
  "salt": "Kosher Salt", // Default to kosher salt
  "kosher salt": "Kosher Salt",
  "sea salt": "Sea Salt",
  "table salt": "Salt",
  "fine sea salt": "Sea Salt",
  "coarse sea salt": "Sea Salt",
  
  "cumin": "Cumin",
  "ground cumin": "Cumin",
  "cumin seeds": "Cumin Seeds",
  "paprika": "Paprika",
  "smoked paprika": "Smoked Paprika",
  "sweet paprika": "Sweet Paprika",
  "turmeric": "Turmeric",
  "ground turmeric": "Turmeric",
  
  // OILS & VINEGARS - Standardize to fl oz
  "olive oil": "Extra-Virgin Olive Oil", // Default to EVOO
  "extra virgin olive oil": "Extra-Virgin Olive Oil",
  "extra-virgin olive oil": "Extra-Virgin Olive Oil",
  "vegetable oil": "Vegetable Oil",
  "canola oil": "Canola Oil",
  "sesame oil": "Sesame Oil",
  "toasted sesame oil": "Toasted Sesame Oil",
  "avocado oil": "Avocado Oil",
  
  "rice vinegar": "Rice Vinegar",
  "rice wine vinegar": "Rice Vinegar", 
  "white wine vinegar": "White Wine Vinegar",
  "red wine vinegar": "Red Wine Vinegar",
  "balsamic vinegar": "Balsamic Vinegar",
  "white vinegar": "White Vinegar",
  "apple cider vinegar": "Apple Cider Vinegar",
  
  // PROTEINS - Standardize weights
  "chicken breast": "Chicken Breasts",
  "chicken breasts": "Chicken Breasts", 
  "boneless chicken breast": "Chicken Breasts",
  "boneless skinless chicken breast": "Chicken Breasts",
  "boneless skinless chicken breasts": "Chicken Breasts",
  "chicken thigh": "Chicken Thighs",
  "chicken thighs": "Chicken Thighs",
  "boneless chicken thighs": "Chicken Thighs",
  "skinless chicken thighs": "Chicken Thighs",
  
  "ground beef": "Ground Beef",
  "lean ground beef": "Lean Ground Beef",
  "flank steak": "Flank Steak",
  "beef steak": "Beef Steak",
  
  "salmon": "Salmon Fillets",
  "salmon fillet": "Salmon Fillets",
  "salmon fillets": "Salmon Fillets",
  "cod": "Cod Fillets",
  "cod fillet": "Cod Fillets", 
  "cod fillets": "Cod Fillets",
  
  // GRAINS & PASTA - Standardize to pounds
  "rice": "White Rice", // Default to white
  "white rice": "White Rice",
  "brown rice": "Brown Rice", 
  "jasmine rice": "Jasmine Rice",
  "basmati rice": "Basmati Rice",
  "long grain rice": "Long Grain White Rice",
  "short grain rice": "Short Grain Rice",
  
  "quinoa": "Quinoa",
  "couscous": "Couscous",
  
  // DAIRY - Standardize units
  "egg": "Large Eggs",
  "eggs": "Large Eggs",
  "large egg": "Large Eggs",
  "large eggs": "Large Eggs",
  
  "butter": "Butter", 
  "unsalted butter": "Unsalted Butter",
  "salted butter": "Salted Butter",
  
  "parmesan": "Parmesan Cheese",
  "parmesan cheese": "Parmesan Cheese", 
  "grated parmesan": "Parmesan Cheese",
  "grated parmesan cheese": "Parmesan Cheese",
  "mozzarella": "Mozzarella Cheese",
  "mozzarella cheese": "Mozzarella Cheese",
  "cheddar": "Cheddar Cheese",
  "cheddar cheese": "Cheddar Cheese",
  "sharp cheddar": "Sharp Cheddar Cheese",
  
  // BAKERY & BREAD ITEMS
  "pizza dough": "Pizza Dough",
  "fresh pizza dough": "Pizza Dough",
  "flour": "All-Purpose Flour", // Default to all-purpose
  "all purpose flour": "All-Purpose Flour",
  "all-purpose flour": "All-Purpose Flour",
  "ap flour": "All-Purpose Flour",
  "bread flour": "Bread Flour",
  "sourdough bread": "Sourdough Bread",
  "sourdough": "Sourdough Bread",
  "crusty bread": "Crusty Bread",
  "artisan bread": "Crusty Bread",
  "pita": "Pita Bread",
  "pita bread": "Pita Bread",
  "corn tortilla": "Corn Tortillas",
  "corn tortillas": "Corn Tortillas",
  
  // DAIRY SPECIALTIES
  "fresh mozzarella": "Fresh Mozzarella",
  "fresh mozzarella cheese": "Fresh Mozzarella",
  "buffalo mozzarella": "Fresh Mozzarella",
  "ricotta": "Ricotta Cheese",
  "ricotta cheese": "Ricotta Cheese",
  "heavy cream": "Heavy Cream",
  "heavy whipping cream": "Heavy Cream",
  "sour cream": "Sour Cream",
  "cream cheese": "Cream Cheese",
  "greek yogurt": "Greek Yogurt",
  "plain greek yogurt": "Greek Yogurt",
  
  // CANNED GOODS - Standardize containers
  "canned tomatoes": "Canned Tomatoes",
  "diced tomatoes": "Canned Diced Tomatoes",
  "crushed tomatoes": "Crushed San Marzano Tomatoes", // Upgrade to premium
  "san marzano tomatoes": "Crushed San Marzano Tomatoes",
  "crushed san marzano tomatoes": "Crushed San Marzano Tomatoes",
  "tomato paste": "Tomato Paste",
  
  "vegetable broth": "Vegetable Broth",
  "chicken broth": "Chicken Broth",
  "beef broth": "Beef Broth",
  "vegetable stock": "Vegetable Broth", // Map stock to broth
  "chicken stock": "Chicken Broth",
  "beef stock": "Beef Broth",
  "coconut milk": "Coconut Milk",
  "canned coconut milk": "Coconut Milk",
  
  // NUTS & SEEDS
  "pine nuts": "Pine Nuts",
  "pignoli nuts": "Pine Nuts",
  "almonds": "Almonds",
  "sliced almonds": "Almonds",
  "slivered almonds": "Almonds",
  "walnuts": "Walnuts",
  "chopped walnuts": "Walnuts",
  "sesame seeds": "Sesame Seeds",
  
  // BAKING STAPLES
  "sugar": "Granulated Sugar", // Default to granulated
  "white sugar": "Granulated Sugar",
  "granulated sugar": "Granulated Sugar",
  "cane sugar": "Granulated Sugar",
  "brown sugar": "Brown Sugar",
  "light brown sugar": "Brown Sugar",
  "packed brown sugar": "Brown Sugar",
  "honey": "Honey",
  "baking powder": "Baking Powder",
  "vanilla": "Vanilla Extract", // Default to extract
  "vanilla extract": "Vanilla Extract",
  "pure vanilla extract": "Vanilla Extract"
};

// CANONICAL INGREDIENT DEFINITIONS
// Each canonical ingredient has standardized unit, category, and common alternates
export const CANONICAL_INGREDIENTS = {
  // PRODUCE
  "Tomatoes": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each",
    alternates: ["tomato", "fresh tomatoes"]
  },
  "Cherry Tomatoes": { 
    unit: "cup", 
    category: "Produce",
    instacart_unit: "pint",
    alternates: ["cherry tomato", "grape tomatoes"]
  },
  "Roma Tomatoes": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each",
    alternates: ["roma tomato", "plum tomatoes"] 
  },
  
  "Red Bell Pepper": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each",
    alternates: ["red bell peppers", "bell pepper"]
  },
  "Yellow Bell Pepper": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each",
    alternates: ["yellow bell peppers"]
  },
  "Green Bell Pepper": { 
    unit: "each", 
    category: "Produce", 
    instacart_unit: "each",
    alternates: ["green bell peppers"]
  },
  
  "Yellow Onion": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each", 
    alternates: ["onion", "onions", "yellow onions"]
  },
  "Red Onion": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each",
    alternates: ["red onions"]
  },
  "White Onion": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each",
    alternates: ["white onions"]
  },
  
  "Lemons": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each",
    alternates: ["lemon"]
  },
  "Limes": { 
    unit: "each", 
    category: "Produce", 
    instacart_unit: "each",
    alternates: ["lime"]
  },
  
  "Garlic": { 
    unit: "head", 
    category: "Produce",
    instacart_unit: "head",
    alternates: ["garlic head", "fresh garlic"]
  },
  "Garlic Cloves": { 
    unit: "clove", 
    category: "Produce",
    instacart_unit: "clove", 
    alternates: ["garlic clove", "clove of garlic"]
  },
  
  "Carrots": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "pound",
    alternates: ["carrot"]
  },
  "Cucumber": { 
    unit: "each", 
    category: "Produce", 
    instacart_unit: "each",
    alternates: ["cucumbers"]
  },
  "English Cucumber": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each",
    alternates: ["english cucumbers"]
  },
  
  "Avocado": { 
    unit: "each", 
    category: "Produce",
    instacart_unit: "each", 
    alternates: ["avocados"]
  },
  
  // FRESH HERBS 
  "Parsley": { 
    unit: "bunch", 
    category: "Fresh Herbs",
    instacart_unit: "bunch",
    alternates: ["fresh parsley", "flat leaf parsley"]
  },
  "Cilantro": { 
    unit: "bunch", 
    category: "Fresh Herbs", 
    instacart_unit: "bunch",
    alternates: ["fresh cilantro"]
  },
  "Basil": { 
    unit: "bunch", 
    category: "Fresh Herbs",
    instacart_unit: "bunch", 
    alternates: ["fresh basil"]
  },
  "Thyme": { 
    unit: "bunch", 
    category: "Fresh Herbs",
    instacart_unit: "bunch",
    alternates: ["fresh thyme"]
  },
  "Oregano": { 
    unit: "bunch", 
    category: "Fresh Herbs", 
    instacart_unit: "bunch",
    alternates: ["fresh oregano"]
  },
  "Mint": { 
    unit: "bunch", 
    category: "Fresh Herbs",
    instacart_unit: "bunch",
    alternates: ["fresh mint", "mint leaves"]
  },
  "Scallions": { 
    unit: "bunch", 
    category: "Fresh Herbs",
    instacart_unit: "bunch", 
    alternates: ["scallion", "green onions", "green onion"]
  },
  
  // SPICES, SEASONINGS, & OILS
  "Black Pepper": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "each", // jar/container
    alternates: ["ground black pepper", "freshly ground black pepper"]
  },
  "White Pepper": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils", 
    instacart_unit: "each",
    alternates: ["ground white pepper"]
  },
  "Red Pepper Flakes": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "each", 
    alternates: ["crushed red pepper", "chili flakes"]
  },
  "Cayenne Pepper": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "each",
    alternates: ["ground cayenne", "cayenne"]
  },
  
  "Kosher Salt": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils", 
    instacart_unit: "each",
    alternates: ["salt"] // Default mapping
  },
  "Sea Salt": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "each",
    alternates: ["fine sea salt", "coarse sea salt"]
  },
  "Salt": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "each", 
    alternates: ["table salt"]
  },
  
  "Cumin": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "each",
    alternates: ["ground cumin"]
  },
  "Cumin Seeds": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils", 
    instacart_unit: "each",
    alternates: ["whole cumin seeds"]
  },
  "Paprika": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "each", 
    alternates: ["sweet paprika"]
  },
  "Smoked Paprika": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "each",
    alternates: ["spanish smoked paprika"]
  },
  "Turmeric": { 
    unit: "ounce", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "each",
    alternates: ["ground turmeric"]
  },
  
  // OILS
  "Extra-Virgin Olive Oil": { 
    unit: "tablespoon", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "fl oz", 
    alternates: ["olive oil", "extra virgin olive oil", "evoo"]
  },
  "Vegetable Oil": { 
    unit: "tablespoon", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "fl oz",
    alternates: ["neutral oil"]
  },
  "Sesame Oil": { 
    unit: "tablespoon", 
    category: "Spices, Seasonings, & Oils", 
    instacart_unit: "fl oz",
    alternates: ["toasted sesame oil"]
  },
  "Avocado Oil": { 
    unit: "tablespoon", 
    category: "Spices, Seasonings, & Oils",
    instacart_unit: "fl oz",
    alternates: []
  },
  
  // VINEGARS  
  "Rice Vinegar": { 
    unit: "tablespoon", 
    category: "Condiments & Sauces",
    instacart_unit: "fl oz",
    alternates: ["rice wine vinegar"]
  },
  "Red Wine Vinegar": { 
    unit: "tablespoon", 
    category: "Condiments & Sauces", 
    instacart_unit: "fl oz",
    alternates: []
  },
  "White Wine Vinegar": { 
    unit: "tablespoon", 
    category: "Condiments & Sauces",
    instacart_unit: "fl oz", 
    alternates: []
  },
  "Balsamic Vinegar": { 
    unit: "tablespoon", 
    category: "Condiments & Sauces",
    instacart_unit: "fl oz",
    alternates: []
  },
  
  // PROTEINS
  "Chicken Breasts": { 
    unit: "pound", 
    category: "Meat & Poultry",
    instacart_unit: "pound",
    alternates: ["chicken breast", "boneless skinless chicken breasts"]
  },
  "Chicken Thighs": { 
    unit: "pound", 
    category: "Meat & Poultry", 
    instacart_unit: "pound",
    alternates: ["chicken thigh", "boneless chicken thighs"]
  },
  "Ground Beef": { 
    unit: "pound", 
    category: "Meat & Poultry",
    instacart_unit: "pound",
    alternates: []
  },
  "Lean Ground Beef": { 
    unit: "pound", 
    category: "Meat & Poultry", 
    instacart_unit: "pound",
    alternates: ["93/7 ground beef", "lean ground beef"]
  },
  
  "Salmon Fillets": { 
    unit: "pound", 
    category: "Seafood",
    instacart_unit: "pound",
    alternates: ["salmon", "salmon fillet"]
  },
  "Cod Fillets": { 
    unit: "pound", 
    category: "Seafood", 
    instacart_unit: "pound",
    alternates: ["cod", "cod fillet"]
  },
  
  // GRAINS
  "White Rice": { 
    unit: "cup", 
    category: "Rice & Grains",
    instacart_unit: "pound",
    alternates: ["rice", "long grain white rice"]
  },
  "Brown Rice": { 
    unit: "cup", 
    category: "Rice & Grains", 
    instacart_unit: "pound",
    alternates: ["long grain brown rice"]
  },
  "Jasmine Rice": { 
    unit: "cup", 
    category: "Rice & Grains",
    instacart_unit: "pound",
    alternates: []
  },
  "Basmati Rice": { 
    unit: "cup", 
    category: "Rice & Grains",
    instacart_unit: "pound", 
    alternates: []
  },
  "Quinoa": { 
    unit: "cup", 
    category: "Rice & Grains",
    instacart_unit: "pound",
    alternates: []
  },
  
  // DAIRY & EGGS
  "Large Eggs": { 
    unit: "each", 
    category: "Dairy & Eggs", 
    instacart_unit: "large",
    alternates: ["egg", "eggs", "large egg"]
  },
  "Butter": { 
    unit: "tablespoon", 
    category: "Dairy & Eggs",
    instacart_unit: "ounce",
    alternates: ["unsalted butter"]
  },
  "Parmesan Cheese": { 
    unit: "ounce", 
    category: "Dairy & Eggs", 
    instacart_unit: "ounce",
    alternates: ["parmesan", "grated parmesan"]
  },
  "Mozzarella Cheese": { 
    unit: "ounce", 
    category: "Dairy & Eggs",
    instacart_unit: "ounce",
    alternates: ["mozzarella"]
  },
  
  // BAKERY & BREAD
  "Pizza Dough": { 
    unit: "each", 
    category: "Bakery & Bread",
    instacart_unit: "each",
    alternates: ["fresh pizza dough", "pizza dough ball"]
  },
  "All-Purpose Flour": { 
    unit: "cup", 
    category: "Baking & Pantry Staples",
    instacart_unit: "pound",
    alternates: ["flour", "ap flour"]
  },
  "Bread Flour": { 
    unit: "cup", 
    category: "Baking & Pantry Staples",
    instacart_unit: "pound",
    alternates: ["high gluten flour"]
  },
  "Sourdough Bread": { 
    unit: "each", 
    category: "Bakery & Bread",
    instacart_unit: "loaf",
    alternates: ["sourdough loaf"]
  },
  "Crusty Bread": { 
    unit: "each", 
    category: "Bakery & Bread", 
    instacart_unit: "loaf",
    alternates: ["artisan bread", "french bread"]
  },
  "Pita Bread": { 
    unit: "package", 
    category: "Bakery & Bread",
    instacart_unit: "package",
    alternates: ["pita"]
  },
  "Corn Tortillas": { 
    unit: "package", 
    category: "Bakery & Bread", 
    instacart_unit: "package",
    alternates: ["corn tortilla"]
  },
  
  // DAIRY SPECIALTIES
  "Fresh Mozzarella": { 
    unit: "ounce", 
    category: "Dairy & Eggs",
    instacart_unit: "ounce",
    alternates: ["fresh mozzarella cheese", "buffalo mozzarella"]
  },
  "Ricotta Cheese": { 
    unit: "ounce", 
    category: "Dairy & Eggs", 
    instacart_unit: "ounce",
    alternates: ["ricotta"]
  },
  "Heavy Cream": { 
    unit: "cup", 
    category: "Dairy & Eggs",
    instacart_unit: "pint",
    alternates: ["heavy whipping cream"]
  },
  "Sour Cream": { 
    unit: "tablespoon", 
    category: "Dairy & Eggs", 
    instacart_unit: "ounce",
    alternates: []
  },
  "Cream Cheese": { 
    unit: "ounce", 
    category: "Dairy & Eggs",
    instacart_unit: "ounce",
    alternates: []
  },
  "Greek Yogurt": { 
    unit: "cup", 
    category: "Dairy & Eggs", 
    instacart_unit: "ounce",
    alternates: ["plain greek yogurt"]
  },
  
  // CANNED & JARRED GOODS
  "Canned Tomatoes": { 
    unit: "can", 
    category: "Canned Goods", 
    instacart_unit: "can",
    alternates: ["canned whole tomatoes"]
  },
  "Canned Diced Tomatoes": { 
    unit: "can", 
    category: "Canned Goods",
    instacart_unit: "can",
    alternates: ["diced tomatoes"]
  },
  "Crushed San Marzano Tomatoes": { 
    unit: "can", 
    category: "Canned Goods",
    instacart_unit: "can",
    alternates: ["san marzano tomatoes", "crushed tomatoes"]
  },
  "Tomato Paste": { 
    unit: "tablespoon", 
    category: "Condiments & Sauces", 
    instacart_unit: "can",
    alternates: []
  },
  "Vegetable Broth": { 
    unit: "cup", 
    category: "Canned Goods",
    instacart_unit: "can",
    alternates: ["vegetable stock"]
  },
  "Chicken Broth": { 
    unit: "cup", 
    category: "Canned Goods", 
    instacart_unit: "can",
    alternates: ["chicken stock"]
  },
  "Coconut Milk": { 
    unit: "can", 
    category: "Canned Goods",
    instacart_unit: "can",
    alternates: ["canned coconut milk"]
  },
  
  // NUTS & SEEDS
  "Pine Nuts": { 
    unit: "ounce", 
    category: "Nuts & Seeds", 
    instacart_unit: "ounce",
    alternates: ["pignoli nuts"]
  },
  "Almonds": { 
    unit: "ounce", 
    category: "Nuts & Seeds",
    instacart_unit: "ounce",
    alternates: ["sliced almonds", "slivered almonds"]
  },
  "Walnuts": { 
    unit: "ounce", 
    category: "Nuts & Seeds", 
    instacart_unit: "ounce",
    alternates: ["chopped walnuts"]
  },
  "Sesame Seeds": { 
    unit: "tablespoon", 
    category: "Nuts & Seeds",
    instacart_unit: "ounce",
    alternates: []
  },
  
  // BAKING & PANTRY STAPLES  
  "Granulated Sugar": { 
    unit: "cup", 
    category: "Baking & Pantry Staples",
    instacart_unit: "pound",
    alternates: ["white sugar", "cane sugar"]
  },
  "Brown Sugar": { 
    unit: "cup", 
    category: "Baking & Pantry Staples", 
    instacart_unit: "pound",
    alternates: ["light brown sugar", "packed brown sugar"]
  },
  "Honey": { 
    unit: "tablespoon", 
    category: "Baking & Pantry Staples",
    instacart_unit: "fl oz",
    alternates: []
  },
  "Baking Powder": { 
    unit: "teaspoon", 
    category: "Baking & Pantry Staples", 
    instacart_unit: "can",
    alternates: []
  },
  "Vanilla Extract": { 
    unit: "teaspoon", 
    category: "Baking & Pantry Staples",
    instacart_unit: "fl oz",
    alternates: ["pure vanilla extract"]
  }
};

// STANDARDIZATION FUNCTIONS
export function standardizeIngredientName(rawName) {
  if (!rawName) return null;
  
  const normalized = rawName.toLowerCase().trim();
  
  // Check direct mapping first
  if (INGREDIENT_STANDARDIZATION_MAP[normalized]) {
    return INGREDIENT_STANDARDIZATION_MAP[normalized];
  }
  
  // Check if it's already a canonical name
  const titleCase = rawName.replace(/\b\w/g, l => l.toUpperCase());
  if (CANONICAL_INGREDIENTS[titleCase]) {
    return titleCase;
  }
  
  // Fallback: convert to title case
  return titleCase;
}

export function getStandardizedIngredient(rawName) {
  const canonicalName = standardizeIngredientName(rawName);
  const ingredientDef = CANONICAL_INGREDIENTS[canonicalName];
  
  if (!ingredientDef) {
    // Fallback for unknown ingredients
    return {
      name: canonicalName,
      unit: "each", // Safe default
      category: "Gourmet", // Catch-all category
      instacart_unit: "each"
    };
  }
  
  return {
    name: canonicalName,
    unit: ingredientDef.unit,
    category: ingredientDef.category, 
    instacart_unit: ingredientDef.instacart_unit
  };
}

export function validateIngredientStandardization(ingredients) {
  const issues = [];
  
  ingredients.forEach((ingredient, index) => {
    const standardized = getStandardizedIngredient(ingredient.name);
    
    if (ingredient.name !== standardized.name) {
      issues.push({
        index,
        original: ingredient.name,
        suggested: standardized.name,
        type: 'name_standardization'
      });
    }
    
    if (ingredient.unit !== standardized.unit) {
      issues.push({
        index,
        field: 'unit',
        original: ingredient.unit,
        suggested: standardized.unit,
        type: 'unit_standardization'
      });
    }
    
    if (ingredient.category !== standardized.category) {
      issues.push({
        index,
        field: 'category', 
        original: ingredient.category,
        suggested: standardized.category,
        type: 'category_standardization'
      });
    }
  });
  
  return issues;
}