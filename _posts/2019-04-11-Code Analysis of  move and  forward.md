---
layout: post
title: "Code Analysis of std::move and std::forward"
---

In the **previous blog post**, we explored **move semantics** and **perfect forwarding**.  
During this discussion, we used two new standard functions: **`std::move`** and **`std::forward`**.

- **Purpose of `std::move`**: Converts an **lvalue** into an **rvalue**.
- **Purpose of `std::forward`**: Preserves the **lvalue or rvalue property** of an argument during forwarding.

Now that we understand **move semantics** and **perfect forwarding**,  
it is worth examining the **internal implementation of `std::move` and `std::forward`**.  
This requires some basic knowledge of **C++ templates**.

<!--more--> 

#### 1. Template Type Deduction Rules
For a template like this:
```cpp
template <typename T>
void wrapper(T&& arg) {
  ......
}

int x=10;
wrapper(x);   // T => int&
wrapper(20);  // T => int
```
When the argument is an **lvalue**, `T` is deduced as an **lvalue reference**, meaning `T = int&`.  
Thus, `T&&` becomes `int& &&`, and according to **reference collapsing rules**, `int& &&` is equivalent to `int&`.

When the argument is an **rvalue**, `T` is deduced as the **type itself**, meaning `T = int`.  
Thus, `T&&` becomes `int&&`, which is a **rvalue reference**.

This is the fundamental reason why `T&&` is called a **universal reference**.

#### 2. Argument Forwarding  
In C++, when forwarding template parameters, **rvalues are copied**, losing their original **temporary nature**, which can lead to unnecessary **performance overhead**.
```cpp
void SomeFunc(int& x) { std::cout << "Lvalue reference called\n"; }
void SomeFunc(int&& x) { std::cout << "Rvalue reference called\n"; }

template <typename T>
void wrapper(T arg) {
    SomeFunc(arg);  // ⚠️ `arg` is always an lvalue inside the function
}

int main() {
    int a = 10;
    wrapper(a);   // ✅ Calls `SomeFunc(int&)` correctly
    wrapper(20);  // ❌ Expected to call `SomeFunc(int&&)` but incorrectly calls `SomeFunc(int&)`
}
```

#### 3. Universal References  
The **universal references**, a term coined by **Scott Meyers**.  
Simply put, a **universal reference** is something that can **bind to both lvalues and rvalues**.  
In code, it typically looks like **`T&&`**.  

There are **two conditions** for something to be a universal reference:  

- It must **strictly match the form `"T&&"`**, meaning it **cannot** have qualifiers like `const`.  
- `T` must be **deduced**, typically as a **template parameter**.  


#### 4. Reference Collapsing  

C++ **template type deduction** follows certain **reference collapsing rules**:  

- `T&  &`   → `T&`  
- `T&&  &`  → `T&`  
- `T&  &&`  → `T&`  
- `T&&  &&` → `T&&`  

#### 5. Implementation of `std::forward` and `std::remove_reference`
```cpp
//`std::remove_reference<T>` is a **type trait** that removes reference qualifiers (`&` or `&&`) from a given type `T`:

template <typename T> 
struct remove_reference{ typedef T type}
template <typename T> 
struct remove_reference<T&>{ typedef T type}
template <typename T> 
struct remove_reference<T&&>{ typedef T type}

//std::move will convert the argument into rvalue reference no matter what arg is
template<typename T>
typename std::remove_reference<T>::type&&  move(T&& arg){ 
    return static_cast<typename std::remove_reference<T>::type&&>(arg); 
}

//std::forward的实现
template <typename T>
T&& forward(typename remove_reference<T>::type& arg){
	return static_cast<T&&>(arg);
}
```
After understanding some of the **advanced tricks in C++ templates**,  
it becomes clear that **`std::move` does nothing**—  
it simply converts an **lvalue or lvalue reference** into an **rvalue reference** at **compile time**.  

Meanwhile, **`std::forward` uses reference collapsing rules**  
to preserve whether the argument was originally an **lvalue reference or an rvalue reference**,  
and returns it accordingly.

### **In simple terms:**
- **`std::move` and `std::forward` perform only compile-time type conversions.**
- **`std::move` returns an rvalue reference.**
- **`std::forward` returns either an lvalue reference or an rvalue reference**:
  - If the argument is an **lvalue (or lvalue reference)** → it returns an **lvalue reference**.
  - If the argument is an **rvalue (or rvalue reference)** → it returns an **rvalue reference**.

🚀 **There is no runtime overhead—these functions generate no actual runtime code!**

Understanding `std::forward` is more challenging than `std::move`.  
However, once you grasp **template type deduction** and **reference collapsing rules**,  
you will fully understand how `std::forward` works:

- **When `arg` is an lvalue**, assuming `arg` is of type `int`: `T` is deduced as `int&`, the return type `T&&` becomes `int& &&`，according to **reference collapsing rules**, `int& &&` collapses to `int&`

- **When `arg` is an rvalue**: `T` is deduced as `int`, the return type `T&&` becomes `int&&`, which is a **true rvalue reference**

Thus, `std::forward` successfully **achieves perfect forwarding**.
