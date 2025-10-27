// components/task/task-images.tsx
import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TaskImagesProps {
  images: Array<{
    fileName: string;
    fileUrl: string;
    _id?: string;
  }>;
  taskId: string;
}

export const TaskImages = ({ images, taskId }: TaskImagesProps) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  const openImage = (index: number) => {
    setSelectedImage(index);
  };

  const closeImage = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    if (selectedImage !== null && selectedImage < images.length - 1) {
      setSelectedImage(selectedImage + 1);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null && selectedImage > 0) {
      setSelectedImage(selectedImage - 1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeImage();
    } else if (e.key === 'ArrowRight') {
      nextImage();
    } else if (e.key === 'ArrowLeft') {
      prevImage();
    }
  };

  return (
    <>
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Attached Images ({images.length})
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((image, index) => (
            <div
              key={image._id || image.fileUrl || index}
              className="relative group cursor-pointer"
              onClick={() => openImage(index)}
            >
              <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                <img
                  src={image.fileUrl}
                  alt={`Task attachment ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage !== null && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-full w-full">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20 z-10"
              onClick={closeImage}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation buttons */}
            {selectedImage > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10"
                onClick={prevImage}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {selectedImage < images.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10"
                onClick={nextImage}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Image counter */}
            <div className="absolute -top-12 left-0 text-white z-10">
              <Badge variant="secondary">
                {selectedImage + 1} / {images.length}
              </Badge>
            </div>

            {/* Image */}
            <div className="flex items-center justify-center h-full">
              <img
                src={images[selectedImage].fileUrl}
                alt={`Task image ${selectedImage + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>

            {/* Image name */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {images[selectedImage].fileName}
            </div>
          </div>
        </div>
      )}
    </>
  );
};