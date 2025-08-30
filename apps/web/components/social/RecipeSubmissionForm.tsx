"use client"

import React, { useState, useCallback } from 'react'
import { Plus, X, Upload, Clock, Users, DollarSign, ChefHat, AlertCircle } from 'lucide-react'
import { RecipeSubmissionData } from '../../types/index'

interface RecipeSubmissionFormProps {
  onSubmit: (data: RecipeSubmissionData) => Promise<void>
  isLoading?: boolean
  className?: string
}

const RecipeSubmissionForm: React.FC<RecipeSubmissionFormProps> = ({
  onSubmit,
  isLoading = false,
  className = ""
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<RecipeSubmissionData>({
    title: '',
    description: '',
    story: '',
    courses: [],
    cuisines: [],
    // prep_time and cook_time omitted (optional properties)
    servings_default: 4,
    difficulty: 'medium',
    spice_level: 3,
    cost_estimate: '$',
    ingredients: [],
    instructions: [],
    tips: [],
    image_files: []
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Predefined options (from existing ChefCart data)
  const courseOptions = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']
  const cuisineOptions = [
    'American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'Indian', 
    'Thai', 'Chinese', 'French', 'Greek', 'Middle Eastern', 'Japanese',
    'Korean', 'Vietnamese', 'Spanish', 'German', 'British', 'Other'
  ]

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1: // Basic Info
        if (!formData.title.trim()) newErrors.title = 'Recipe title is required'
        if (!formData.description.trim()) newErrors.description = 'Recipe description is required'
        if (formData.courses.length === 0) newErrors.courses = 'Select at least one meal type'
        break
      
      case 2: // Images & Details
        if (formData.image_files?.length === 0) newErrors.images = 'Add at least one photo of your dish'
        break
      
      case 3: // Cooking Info
        if (!formData.prep_time || formData.prep_time < 1) newErrors.prep_time = 'Prep time is required'
        if (!formData.cook_time || formData.cook_time < 1) newErrors.cook_time = 'Cook time is required'
        if (formData.servings_default < 1 || formData.servings_default > 20) {
          newErrors.servings = 'Servings must be between 1 and 20'
        }
        break
      
      case 4: // Ingredients
        if (formData.ingredients.length === 0) newErrors.ingredients = 'Add at least one ingredient'
        formData.ingredients.forEach((ing, idx) => {
          if (!ing.display_name.trim()) newErrors[`ingredient_${idx}_name`] = 'Ingredient name required'
          if (!ing.quantity || ing.quantity <= 0) newErrors[`ingredient_${idx}_qty`] = 'Quantity required'
          if (!ing.unit.trim()) newErrors[`ingredient_${idx}_unit`] = 'Unit required'
        })
        break
      
      case 5: // Instructions
        if (formData.instructions.length === 0) newErrors.instructions = 'Add at least one instruction step'
        formData.instructions.forEach((inst, idx) => {
          if (!inst.text.trim()) newErrors[`instruction_${idx}`] = 'Step description required'
        })
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (validateStep(5)) {
      await onSubmit(formData)
    }
  }

  // Image upload handlers
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024 // 10MB
    })

    setFormData(prev => ({
      ...prev,
      image_files: [...(prev.image_files || []), ...validFiles].slice(0, 5) // Max 5 images
    }))
  }, [])

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      image_files: prev.image_files?.filter((_, i) => i !== index) || []
    }))
  }

  // Dynamic ingredient/instruction handlers
  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { display_name: '', quantity: 0, unit: '' }]
    }))
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }))
  }

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, { step_no: prev.instructions.length + 1, text: '' }]
    }))
  }

  const updateInstruction = (index: number, text: string) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? { ...inst, text } : inst
      )
    }))
  }

  const removeInstruction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index).map((inst, i) => ({
        ...inst,
        step_no: i + 1
      }))
    }))
  }

  const stepTitles = [
    'Basic Information',
    'Photos & Details', 
    'Cooking Information',
    'Ingredients',
    'Instructions'
  ]

  return (
    <div className={`max-w-2xl mx-auto bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden ${className}`}>
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Share Your Recipe</h2>
        <div className="flex items-center gap-2">
          {stepTitles.map((title, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${index + 1 <= currentStep ? 'bg-white text-brand-600' : 'bg-brand-400 text-brand-100'}
              `}>
                {index + 1}
              </div>
              {index < stepTitles.length - 1 && (
                <div className={`w-8 h-0.5 ${index + 1 < currentStep ? 'bg-white' : 'bg-brand-400'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-brand-100">{stepTitles[currentStep - 1]}</p>
      </div>

      <div className="p-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Recipe Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="My Amazing Pasta Recipe"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
                  errors.title ? 'border-red-500' : 'border-neutral-300'
                }`}
              />
              {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="A delicious and easy recipe that's perfect for..."
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none ${
                  errors.description ? 'border-red-500' : 'border-neutral-300'
                }`}
              />
              {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Your Story (Optional)
              </label>
              <textarea
                value={formData.story}
                onChange={(e) => setFormData(prev => ({ ...prev, story: e.target.value }))}
                placeholder="Tell us about this recipe - where it comes from, why it's special to you..."
                rows={3}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Meal Types *
              </label>
              <div className="flex flex-wrap gap-2">
                {courseOptions.map(course => (
                  <button
                    key={course}
                    type="button"
                    onClick={() => {
                      const isSelected = formData.courses.includes(course)
                      setFormData(prev => ({
                        ...prev,
                        courses: isSelected
                          ? prev.courses.filter(c => c !== course)
                          : [...prev.courses, course]
                      }))
                    }}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium transition-colors border
                      ${formData.courses.includes(course)
                        ? 'bg-brand-100 text-brand-700 border-brand-300'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                      }
                    `}
                  >
                    {course.charAt(0).toUpperCase() + course.slice(1)}
                  </button>
                ))}
              </div>
              {errors.courses && <p className="text-red-600 text-sm mt-1">{errors.courses}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Cuisine Type
              </label>
              <select
                value={formData.cuisines[0] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  cuisines: e.target.value ? [e.target.value] : []
                }))}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              >
                <option value="">Select cuisine type</option>
                {cuisineOptions.map(cuisine => (
                  <option key={cuisine} value={cuisine}>{cuisine}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Photos & Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Recipe Photos * (Max 5 images, 10MB each)
              </label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                errors.images ? 'border-red-300' : 'border-neutral-300 hover:border-brand-400'
              }`}>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-600">Click to upload photos or drag and drop</p>
                  <p className="text-xs text-neutral-500 mt-1">JPEG, PNG, WebP up to 10MB each</p>
                </label>
              </div>
              {errors.images && <p className="text-red-600 text-sm mt-1">{errors.images}</p>}

              {/* Image Preview */}
              {formData.image_files && formData.image_files.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {formData.image_files.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Recipe photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Cooking Information */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Prep Time (minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.prep_time || ''}
                  onChange={(e) => setFormData(prev => {
                    const newData = { ...prev }
                    if (e.target.value) {
                      newData.prep_time = parseInt(e.target.value)
                    } else {
                      delete newData.prep_time
                    }
                    return newData
                  })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
                    errors.prep_time ? 'border-red-500' : 'border-neutral-300'
                  }`}
                />
                {errors.prep_time && <p className="text-red-600 text-sm mt-1">{errors.prep_time}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Cook Time (minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.cook_time || ''}
                  onChange={(e) => setFormData(prev => {
                    const newData = { ...prev }
                    if (e.target.value) {
                      newData.cook_time = parseInt(e.target.value)
                    } else {
                      delete newData.cook_time
                    }
                    return newData
                  })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
                    errors.cook_time ? 'border-red-500' : 'border-neutral-300'
                  }`}
                />
                {errors.cook_time && <p className="text-red-600 text-sm mt-1">{errors.cook_time}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Servings *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.servings_default}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    servings_default: parseInt(e.target.value) || 1
                  }))}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
                    errors.servings ? 'border-red-500' : 'border-neutral-300'
                  }`}
                />
                {errors.servings && <p className="text-red-600 text-sm mt-1">{errors.servings}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    difficulty: e.target.value as 'easy' | 'medium' | 'challenging'
                  }))}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="challenging">Challenging</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Spice Level
                </label>
                <select
                  value={formData.spice_level}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    spice_level: parseInt(e.target.value)
                  }))}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                >
                  <option value={1}>1 - Mild</option>
                  <option value={2}>2 - Light</option>
                  <option value={3}>3 - Medium</option>
                  <option value={4}>4 - Hot</option>
                  <option value={5}>5 - Very Hot</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Estimated Cost Per Serving
              </label>
              <div className="flex gap-3">
                {['$', '$$', '$$$'].map(cost => (
                  <button
                    key={cost}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cost_estimate: cost as '$' | '$$' | '$$$' }))}
                    className={`
                      flex-1 py-3 px-4 rounded-lg font-medium transition-colors border
                      ${formData.cost_estimate === cost
                        ? 'bg-brand-100 text-brand-700 border-brand-300'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <DollarSign className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs">
                      {cost === '$' ? 'Budget' : cost === '$$' ? 'Moderate' : 'Premium'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Ingredients */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Recipe Ingredients</h3>
              <button
                onClick={addIngredient}
                className="flex items-center gap-2 px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Ingredient
              </button>
            </div>

            {formData.ingredients.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <ChefHat className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p>Add ingredients to get started</p>
              </div>
            )}

            <div className="space-y-3">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Ingredient name"
                      value={ingredient.display_name}
                      onChange={(e) => updateIngredient(index, 'display_name', e.target.value)}
                      className={`px-3 py-2 border rounded focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
                        errors[`ingredient_${index}_name`] ? 'border-red-500' : 'border-neutral-300'
                      }`}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Amount"
                      value={ingredient.quantity || ''}
                      onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className={`px-3 py-2 border rounded focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
                        errors[`ingredient_${index}_qty`] ? 'border-red-500' : 'border-neutral-300'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Unit (cups, tsp, etc.)"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      className={`px-3 py-2 border rounded focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
                        errors[`ingredient_${index}_unit`] ? 'border-red-500' : 'border-neutral-300'
                      }`}
                    />
                  </div>
                  <button
                    onClick={() => removeIngredient(index)}
                    className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.ingredients && <p className="text-red-600 text-sm">{errors.ingredients}</p>}
          </div>
        )}

        {/* Step 5: Instructions */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Cooking Instructions</h3>
              <button
                onClick={addInstruction}
                className="flex items-center gap-2 px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </button>
            </div>

            {formData.instructions.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <ChefHat className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p>Add cooking steps to guide others</p>
              </div>
            )}

            <div className="space-y-4">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-1">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <textarea
                      placeholder={`Step ${index + 1}: Describe what to do...`}
                      value={instruction.text}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      rows={3}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none ${
                        errors[`instruction_${index}`] ? 'border-red-500' : 'border-neutral-300'
                      }`}
                    />
                    {errors[`instruction_${index}`] && (
                      <p className="text-red-600 text-sm mt-1">{errors[`instruction_${index}`]}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeInstruction(index)}
                    className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors flex-shrink-0 mt-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.instructions && <p className="text-red-600 text-sm">{errors.instructions}</p>}

            {/* Optional Tips */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Cooking Tips (Optional)
              </label>
              <textarea
                placeholder="Share any helpful tips, variations, or secrets for success..."
                value={formData.tips?.join('\n') || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tips: e.target.value ? e.target.value.split('\n').filter(tip => tip.trim()) : []
                }))}
                rows={3}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
              />
            </div>

            {/* Final Review Summary */}
            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
              <h4 className="font-medium text-brand-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Recipe Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-600">Total Time:</span>
                  <span className="ml-2 font-medium text-neutral-900">
                    {((formData.prep_time || 0) + (formData.cook_time || 0))} minutes
                  </span>
                </div>
                <div>
                  <span className="text-neutral-600">Servings:</span>
                  <span className="ml-2 font-medium text-neutral-900">{formData.servings_default}</span>
                </div>
                <div>
                  <span className="text-neutral-600">Difficulty:</span>
                  <span className="ml-2 font-medium text-neutral-900 capitalize">{formData.difficulty}</span>
                </div>
                <div>
                  <span className="text-neutral-600">Ingredients:</span>
                  <span className="ml-2 font-medium text-neutral-900">{formData.ingredients.length} items</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-neutral-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-2 text-neutral-600 hover:text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="text-sm text-neutral-500">
            Step {currentStep} of {stepTitles.length}
          </div>

          {currentStep < stepTitles.length ? (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Recipe'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecipeSubmissionForm