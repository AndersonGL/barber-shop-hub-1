-- Allow admins to delete order_items
CREATE POLICY "Admins can delete order items"
  ON public.order_items
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete orders
CREATE POLICY "Admins can delete orders"
  ON public.orders
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
