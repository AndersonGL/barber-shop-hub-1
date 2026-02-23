import { Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Tables } from '@/integrations/supabase/types';

interface ProductCardProps {
  product: Tables<'products'>;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  isAdmin?: boolean;
}

const ProductCard = ({ product, isFavorite, onToggleFavorite, onAddToCart, isAdmin }: ProductCardProps) => {
  return (
    <Card className="overflow-hidden border-border hover:border-gold transition-all duration-300 hover:shadow-gold group animate-fade-in">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="h-12 w-12" />
          </div>
        )}
        {!isAdmin && (
          <button
            onClick={() => onToggleFavorite(product.id)}
            className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
          >
            <Heart className={`h-5 w-5 transition-colors ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </button>
        )}
        {product.category && (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-primary/90 text-primary-foreground rounded">
            {product.category}
          </span>
        )}
        {!isAdmin && product.stock > 0 && (
          <button
            onClick={() => onAddToCart(product.id)}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/80 text-primary-foreground
                       sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300 ease-out
                       flex items-center justify-center gap-2 py-3 font-display tracking-wider text-xs font-bold"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            ADICIONAR AO CARRINHO
          </button>
        )}
      </div>
      <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
        <h3 className="font-display text-sm sm:text-base font-semibold tracking-wide leading-tight break-words line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-snug">{product.description}</p>
        )}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xl font-bold text-gradient-gold font-display">
              R$ {Number(product.price).toFixed(2)}
            </p>
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                Frete: R$ {Number(product.shipping_cost).toFixed(2)}
              </p>
            )}
          </div>
          {!isAdmin && (
            <Button
              size="sm"
              className="bg-gradient-gold text-primary-foreground gap-1.5 transition-all hover:scale-105 hover:shadow-gold active:scale-95"
              onClick={() => onAddToCart(product.id)}
              disabled={product.stock === 0}
              title={product.stock === 0 ? 'Produto esgotado' : 'Adicionar ao carrinho'}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
        </div>
        {product.stock <= 5 && product.stock > 0 && (
          <p className="text-xs text-destructive">Últimas {product.stock} unidades!</p>
        )}
        {product.stock === 0 && (
          <p className="text-xs text-destructive font-semibold">Esgotado</p>
        )}
      </CardContent>
    </Card>
  );
};

// Need this import for the fallback icon
import { Package } from 'lucide-react';

export default ProductCard;
