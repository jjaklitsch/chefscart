"use client"

import Image from 'next/image'

const mealImages = [
  { src: '/images/meals/meal-1.webp', alt: 'Mediterranean bowl with grilled chicken, quinoa, avocado, olives, feta, and vegetables' },
  { src: '/images/meals/meal-2.webp', alt: 'Breakfast omelet with spinach, mushrooms, served with roasted potatoes and avocado' },
  { src: '/images/meals/meal-3.webp', alt: 'Grilled steak with herb butter, roasted potatoes, and asparagus' },
  { src: '/images/meals/meal-4.webp', alt: 'Healthy grain bowl with grilled chicken, sweet potato, avocado, tomatoes, and greens' },
  { src: '/images/meals/meal-5.webp', alt: 'Herb-crusted salmon with asparagus and lemon' },
  { src: '/images/meals/meal-6.webp', alt: 'Blueberry pancakes with maple syrup and fresh blueberries' },
  { src: '/images/meals/meal-7.webp', alt: 'Korean-style bibimbap bowl with beef, vegetables, and fried egg' },
  { src: '/images/meals/meal-8.webp', alt: 'Gourmet meal with seasonal ingredients' },
]

export default function MealShowcase() {
  return (
    <section className="mb-16">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-display font-bold text-center text-neutral-800 mb-12">
          Delicious Meals Made Simple
        </h2>
        <p className="text-center text-neutral-600 text-lg mb-12 max-w-2xl mx-auto">
          From quick everyday meals to special occasion dishes, discover recipes that fit your lifestyle and taste preferences.
        </p>
        
        {/* Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {mealImages.map((meal, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-xl shadow-soft hover:shadow-brand-lg transition-all duration-300 ease-out hover:-translate-y-1"
            >
              <Image
                src={meal.src}
                alt={meal.alt}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
            </div>
          ))}
        </div>
        
        {/* Bottom CTA Text */}
        <div className="text-center mt-12">
          <p className="text-neutral-600 text-lg">
            Ready to discover your next favorite meal?{' '}
            <span className="text-brand-600 font-semibold">Start planning now!</span>
          </p>
        </div>
      </div>
    </section>
  )
}