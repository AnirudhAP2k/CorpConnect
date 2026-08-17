import React from 'react'
import { CardWrapper } from './card-wrapper'
import { AlertTriangle } from 'lucide-react'

const ErrorCard = () => {
  return (
    <>
      <CardWrapper
        headerLabel="Oops! Something went wrong!"
        backButonHref="/login"
        backButonLabel="Back to login"
        >
            <div className="w-full flex justify-center items-center">
                <AlertTriangle className="text-destructive" />
            </div>
        </CardWrapper>
    </>
  )
}

export default ErrorCard
