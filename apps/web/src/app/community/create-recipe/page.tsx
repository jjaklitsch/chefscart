'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { Camera, Plus, X, Clock, Users, ChefHat, BookOpen } from 'lucide-react'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'

interface RecipeIngredient {
  id: string
  name: string
  amount: string
  unit: string
}

interface RecipeInstruction {
  id: string
  step_number: number
  instruction: string
}

export default function CreateRecipePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState(4)
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [cuisine, setCuisine] = useState('')
  const [dietaryInfo, setDietaryInfo] = useState<string[]>([])
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { id: '1', name: '', amount: '', unit: '' }
  ])
  const [instructions, setInstructions] = useState<RecipeInstruction[]>([
    { id: '1', step_number: 1, instruction: '' }
  ])
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cuisineOptions = [
    'American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 
    'Indian', 'French', 'Thai', 'Japanese', 'Greek', 'Other'
  ]

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 
    'Paleo', 'Low-Carb', 'High-Protein', 'Nut-Free'
  ]

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const addIngredient = () => {
    const newId = (ingredients.length + 1).toString()
    setIngredients([...ingredients, { id: newId, name: '', amount: '', unit: '' }])
  }

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id))
    }
  }

  const updateIngredient = (id: string, field: keyof RecipeIngredient, value: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ))
  }

  const addInstruction = () => {
    const newId = (instructions.length + 1).toString()
    const stepNumber = instructions.length + 1
    setInstructions([...instructions, { id: newId, step_number: stepNumber, instruction: '' }])
  }

  const removeInstruction = (id: string) => {
    if (instructions.length > 1) {
      const filtered = instructions.filter(inst => inst.id !== id)
      const reordered = filtered.map((inst, index) => ({ ...inst, step_number: index + 1 }))
      setInstructions(reordered)
    }
  }

  const updateInstruction = (id: string, instruction: string) => {
    setInstructions(instructions.map(inst => 
      inst.id === id ? { ...inst, instruction } : inst
    ))
  }

  const toggleDietaryInfo = (diet: string) => {
    if (dietaryInfo.includes(diet)) {
      setDietaryInfo(dietaryInfo.filter(d => d !== diet))
    } else {
      setDietaryInfo([...dietaryInfo, diet])
    }
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setImages([...images, ...newFiles].slice(0, 5)) // Max 5 images
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      
      const recipeData = {
        title: title.trim(),
        description: description.trim(),
        servings,
        prep_time: parseInt(prepTime),
        cook_time: parseInt(cookTime),
        total_time: parseInt(prepTime) + parseInt(cookTime),
        difficulty,
        cuisine,
        dietary_info: dietaryInfo,
        ingredients: ingredients.filter(ing => ing.name.trim()),
        instructions: instructions.filter(inst => inst.instruction.trim()),
        tags,
        author_id: user.id
      }

      formData.append('recipe', JSON.stringify(recipeData))
      
      images.forEach((image, index) => {
        formData.append(`image_${index}`, image)
      })

      const response = await fetch('/api/social/recipes', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        router.push(`/community/recipe/${result.recipe.slug}`)
      } else {
        alert('Failed to create recipe. Please try again.')
      }
    } catch (error) {
      console.error('Error creating recipe:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 mb-4">
            <ChefHat className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Share Your Recipe</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Share your culinary creations with the ChefsCart community. Help others discover new flavors and cooking techniques!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Recipe Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipe Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Give your recipe a delicious name..."
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Tell us what makes this recipe special..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Servings *
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuisine Type *
                </label>
                <select
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select cuisine...</option>
                  {cuisineOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Prep Time (minutes) *
                </label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Cook Time (minutes) *
                </label>
                <input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Difficulty */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Difficulty Level</label>
              <div className="flex gap-4">
                {[
                  { value: 'easy', label: 'Easy', color: 'green' },
                  { value: 'medium', label: 'Medium', color: 'yellow' },
                  { value: 'challenging', label: 'Challenging', color: 'red' }
                ].map(({ value, label, color }) => (
                  <label key={value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="difficulty"
                      value={value}
                      checked={difficulty === value}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-2 ${
                      difficulty === value 
                        ? `bg-${color}-500 border-${color}-500` 
                        : `border-gray-300`
                    }`} />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dietary Info */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Dietary Information</label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map(diet => (
                  <button
                    key={diet}
                    type="button"
                    onClick={() => toggleDietaryInfo(diet)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dietaryInfo.includes(diet)
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {diet}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Ingredients</h2>
              <button
                type="button"
                onClick={addIngredient}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Ingredient
              </button>
            </div>

            <div className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div key={ingredient.id} className="flex gap-3 items-center">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                      placeholder="Ingredient name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="text"
                      value={ingredient.amount}
                      onChange={(e) => updateIngredient(ingredient.id, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                      placeholder="Unit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(ingredient.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Instructions</h2>
              <button
                type="button"
                onClick={addInstruction}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </button>
            </div>

            <div className="space-y-4">
              {instructions.map((instruction, index) => (
                <div key={instruction.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-medium text-sm">
                    {instruction.step_number}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={instruction.instruction}
                      onChange={(e) => updateInstruction(instruction.id, e.target.value)}
                      placeholder="Describe this step..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>
                  {instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInstruction(instruction.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Photos (Optional)
            </h2>
            
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors"
                >
                  <Camera className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Add photos (max 5)</span>
                </label>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Recipe image ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags (Optional)</h2>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Add
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-purple-500 hover:text-purple-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !description || !prepTime || !cookTime || !cuisine}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Publishing Recipe...' : 'Publish Recipe'}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  )
}