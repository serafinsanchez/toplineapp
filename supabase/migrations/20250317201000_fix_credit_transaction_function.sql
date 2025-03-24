-- Create or update the function to handle credit transactions
CREATE OR REPLACE FUNCTION public.handle_credit_transaction(
    p_user_id UUID,
    p_type TEXT,
    p_amount INTEGER,
    p_stripe_transaction_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance with row lock
    SELECT balance INTO v_current_balance
    FROM public.user_profiles
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- If there's no profile, create one with initial balance
    IF v_current_balance IS NULL THEN
        INSERT INTO public.user_profiles (user_id, balance)
        VALUES (p_user_id, 0)
        RETURNING balance INTO v_current_balance;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- For 'use' transactions, check if user has enough credits
    IF p_type = 'use' AND (v_current_balance < ABS(p_amount) OR v_current_balance IS NULL) THEN
        RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', v_current_balance, ABS(p_amount);
    END IF;
    
    -- Begin transaction
    BEGIN
        -- Insert transaction record
        INSERT INTO public.transactions (user_id, type, amount, stripe_transaction_id)
        VALUES (p_user_id, p_type, p_amount, p_stripe_transaction_id)
        RETURNING id INTO v_transaction_id;
        
        -- Update user balance
        UPDATE public.user_profiles
        SET 
            balance = v_new_balance,
            updated_at = now()
        WHERE user_id = p_user_id;
        
        -- Verify the update was successful
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update user balance';
        END IF;
        
        -- Return the transaction ID
        RETURN v_transaction_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error in transaction: %. Current balance: %, Attempted change: %', 
                SQLERRM, v_current_balance, p_amount;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 