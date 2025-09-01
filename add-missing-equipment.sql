-- Add all missing cooking equipment items to the cooking_equipment table
-- This script should be run in the Supabase SQL Editor

INSERT INTO cooking_equipment (name, display_name, amazon_search_terms, popularity_score, is_essential) VALUES
-- High Priority Essential Items
('spatula', 'Spatula', '["spatula", "cooking spatula", "kitchen spatula"]', 85, true),
('measuring cup', 'Measuring Cup', '["measuring cup", "measuring cups", "liquid measuring cup"]', 90, true),
('steamer basket', 'Steamer Basket', '["steamer basket", "vegetable steamer", "bamboo steamer"]', 70, false),
('mixing bowl', 'Mixing Bowl', '["mixing bowl", "mixing bowls", "stainless steel bowl"]', 95, true),
('whisk', 'Whisk', '["whisk", "kitchen whisk", "wire whisk"]', 85, true),
('measuring spoon', 'Measuring Spoon', '["measuring spoon", "measuring spoons", "teaspoon tablespoon set"]', 85, true),
('bowl', 'Bowl', '["bowl", "serving bowl", "ceramic bowl"]', 95, true),
('spoon', 'Spoon', '["spoon", "kitchen spoon", "cooking spoon"]', 95, true),
('fork', 'Fork', '["fork", "kitchen fork", "serving fork"]', 90, true),
('oven mitt', 'Oven Mitt', '["oven mitt", "oven mitts", "heat resistant gloves"]', 90, true),

-- Medium Priority Common Items
('tongs', 'Tongs', '["tongs", "kitchen tongs", "cooking tongs"]', 80, false),
('ladle', 'Ladle', '["ladle", "soup ladle", "serving ladle"]', 75, false),
('wooden spoon', 'Wooden Spoon', '["wooden spoon", "cooking spoon", "wooden utensil"]', 80, false),
('colander', 'Colander', '["colander", "strainer", "pasta strainer"]', 75, false),
('sieve', 'Sieve', '["sieve", "fine mesh strainer", "flour sifter"]', 70, false),
('rolling pin', 'Rolling Pin', '["rolling pin", "baking rolling pin", "wooden rolling pin"]', 65, false),
('slotted spoon', 'Slotted Spoon', '["slotted spoon", "perforated spoon", "draining spoon"]', 70, false),
('kitchen thermometer', 'Kitchen Thermometer', '["kitchen thermometer", "cooking thermometer", "meat thermometer"]', 70, false),
('kitchen timer', 'Kitchen Timer', '["kitchen timer", "cooking timer", "digital timer"]', 75, false),
('kitchen scale', 'Kitchen Scale', '["kitchen scale", "food scale", "digital scale"]', 80, false),

-- Specialized Tools
('skimmer', 'Skimmer', '["skimmer", "foam skimmer", "spider strainer"]', 50, false),
('funnel', 'Funnel', '["funnel", "kitchen funnel", "canning funnel"]', 60, false),
('baster', 'Baster', '["baster", "turkey baster", "bulb baster"]', 55, false),
('melon baller', 'Melon Baller', '["melon baller", "ice cream scoop", "fruit baller"]', 40, false),
('pastry brush', 'Pastry Brush', '["pastry brush", "basting brush", "silicone brush"]', 65, false),
('pastry cutter', 'Pastry Cutter', '["pastry cutter", "dough cutter", "bench scraper"]', 50, false),
('dough scraper', 'Dough Scraper', '["dough scraper", "bench scraper", "pastry scraper"]', 55, false),
('offset spatula', 'Offset Spatula', '["offset spatula", "icing spatula", "cake spatula"]', 60, false),
('palette knife', 'Palette Knife', '["palette knife", "icing knife", "cake decorating knife"]', 45, false),

-- Appliances
('microwave', 'Microwave', '["microwave", "microwave oven", "countertop microwave"]', 85, true),
('oven', 'Oven', '["oven", "wall oven", "convection oven"]', 95, true),
('stove', 'Stove', '["stove", "cooktop", "gas range"]', 95, true),
('broiler', 'Broiler', '["broiler", "oven broiler", "broiler pan"]', 60, false),
('grill', 'Grill', '["grill", "outdoor grill", "gas grill"]', 70, false),
('teapot', 'Teapot', '["teapot", "tea kettle", "whistling kettle"]', 65, false),

-- Storage & Prep Items
('ramekin', 'Ramekin', '["ramekin", "ramekins", "individual baking dish"]', 70, false),
('aluminum foil', 'Aluminum Foil', '["aluminum foil", "foil", "heavy duty foil"]', 85, true),
('plastic wrap', 'Plastic Wrap', '["plastic wrap", "cling wrap", "food wrap"]', 80, true),
('wax paper', 'Wax Paper', '["wax paper", "parchment paper", "baking paper"]', 75, false),
('baking paper', 'Baking Paper', '["baking paper", "parchment paper", "non-stick paper"]', 80, true),
('ziploc bags', 'Ziploc Bags', '["ziploc bags", "storage bags", "freezer bags"]', 85, true),
('kitchen towels', 'Kitchen Towels', '["kitchen towels", "dish towels", "tea towels"]', 90, true),
('paper towels', 'Paper Towels', '["paper towels", "kitchen paper", "absorbent towels"]', 95, true),
('cheesecloth', 'Cheesecloth', '["cheesecloth", "muslin cloth", "straining cloth"]', 50, false),
('kitchen twine', 'Kitchen Twine', '["kitchen twine", "cooking string", "butcher twine"]', 55, false),

-- Baking Specialized Items
('cake server', 'Cake Server', '["cake server", "pie server", "cake lifter"]', 60, false),
('cake topper', 'Cake Topper', '["cake topper", "cake decorations", "birthday candles"]', 50, false),
('cookie cutter', 'Cookie Cutter', '["cookie cutter", "cookie cutters", "biscuit cutter"]', 65, false),
('muffin liners', 'Muffin Liners', '["muffin liners", "cupcake liners", "baking cups"]', 70, false),
('cupcake toppers', 'Cupcake Toppers', '["cupcake toppers", "cake decorations", "edible decorations"]', 45, false),
('frosting cake topper', 'Frosting Cake Topper', '["cake decorating tools", "frosting tips", "piping bags"]', 50, false),
('edible cake image', 'Edible Cake Image', '["edible cake image", "cake decorating", "photo cake"]', 30, false),

-- Molds and Forms
('cake pop mold', 'Cake Pop Mold', '["cake pop mold", "cake pop maker", "silicone mold"]', 45, false),
('chocolate mold', 'Chocolate Mold', '["chocolate mold", "candy mold", "silicone chocolate mold"]', 40, false),
('popsicle molds', 'Popsicle Molds', '["popsicle molds", "ice pop molds", "frozen treat molds"]', 50, false),
('ice cube tray', 'Ice Cube Tray', '["ice cube tray", "ice molds", "silicone ice tray"]', 80, false),
('kugelhopf pan', 'Kugelhopf Pan', '["kugelhopf pan", "bundt pan", "tube pan"]', 40, false),
('silicone kugelhopf pan', 'Silicone Kugelhopf Pan', '["silicone bundt pan", "silicone kugelhopf", "non-stick bundt"]', 35, false),
('madeleine form', 'Madeleine Form', '["madeleine pan", "shell cake pan", "madeleine mold"]', 35, false),

-- Serving and Tools
('gravy boat', 'Gravy Boat', '["gravy boat", "sauce boat", "gravy pitcher"]', 60, false),
('ice cream scoop', 'Ice Cream Scoop', '["ice cream scoop", "cookie scoop", "portion scoop"]', 75, false),
('salad spinner', 'Salad Spinner', '["salad spinner", "lettuce spinner", "vegetable dryer"]', 70, false),
('candy thermometer', 'Candy Thermometer', '["candy thermometer", "deep fry thermometer", "sugar thermometer"]', 45, false),
('pot holder', 'Pot Holder', '["pot holder", "hot pad", "trivet"]', 85, true),

-- Specialty Items and Accessories
('skewers', 'Skewers', '["skewers", "bamboo skewers", "metal skewers"]', 65, false),
('wooden skewers', 'Wooden Skewers', '["wooden skewers", "bamboo skewers", "cocktail picks"]', 60, false),
('metal skewers', 'Metal Skewers', '["metal skewers", "stainless steel skewers", "reusable skewers"]', 55, false),
('cocktail sticks', 'Cocktail Sticks', '["cocktail sticks", "toothpicks", "appetizer picks"]', 60, false),
('toothpicks', 'Toothpicks', '["toothpicks", "wooden picks", "cocktail picks"]', 70, false),
('popsicle sticks', 'Popsicle Sticks', '["popsicle sticks", "craft sticks", "wooden sticks"]', 45, false),
('lollipop sticks', 'Lollipop Sticks', '["lollipop sticks", "cake pop sticks", "candy sticks"]', 40, false),
('chopsticks', 'Chopsticks', '["chopsticks", "wooden chopsticks", "cooking chopsticks"]', 60, false),
('drinking straws', 'Drinking Straws', '["drinking straws", "paper straws", "reusable straws"]', 65, false),

-- Specialty Pans and Boards
('broiler pan', 'Broiler Pan', '["broiler pan", "roasting pan", "oven safe pan"]', 60, false),
('pizza board', 'Pizza Board', '["pizza board", "pizza peel", "wooden pizza board"]', 50, false),
('wire rack', 'Wire Rack', '["wire rack", "cooling rack", "baking rack"]', 75, false),
('sifter', 'Sifter', '["sifter", "flour sifter", "fine mesh sieve"]', 60, false),

-- Specialty Molds
('heart shaped silicone form', 'Heart Shaped Silicone Form', '["heart shaped mold", "silicone heart pan", "valentine cake pan"]', 35, false),
('silicone muffin liners', 'Silicone Muffin Liners', '["silicone muffin liners", "reusable baking cups", "silicone cupcake liners"]', 65, false),

-- Additional Specialty Items  
('blow torch', 'Blow Torch', '["culinary torch", "kitchen torch", "creme brulee torch"]', 45, false)

ON CONFLICT (name) DO NOTHING;