---
layout: post
title: "C++20 Big Four: Range"
---

This article concludes the "Big Four" series of C++20. Many readers may wonder: what exactly is the "Ranges" feature that places it among the Big Four?

Initially, I had the same question. The first three features in C++20 were "revolutionary": Modules transformed project organization, Coroutines redefined concurrency, and Concepts brought the biggest change to template programming since its inception. So, what makes Ranges deserving of the Big Four? It fundamentally changes the way we handle loops by providing a higher level of abstraction.

<!--more-->

### What is a Range?

A Range is defined as any object with `begin()` and `end()` iterators. There are two main types of Ranges: Containers and Views. Containers own the data pointed to by `begin()` and `end()`, while Views do not. Views are lightweight and easy to copy and move.

Consider an example to understand the concept of Ranges:
1. Given an array of integers, filter out the even numbers.
2. Square each remaining number.
3. Reverse the order of the squared numbers.

~~~cpp
#include <algorithm>
#include <vector>
#include <iostream>

int main() {
    const std::vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto even = [](int i) { return 0 == i % 2; };
    auto square = [](int i) { return i * i; };
    
    std::vector<int> temp;    
    std::copy_if(begin(numbers), end(numbers), std::back_inserter(temp), even);
    std::transform(begin(temp), end(temp), begin(temp), square);
    std::vector<int> temp2(rbegin(temp), rend(temp));
    
    for (auto iter = begin(temp2); iter!=end(temp2); ++iter)
        std::cout << *iter << ' ';                                  
}
~~~

Before C++20 Ranges, we had to use `copy_if`, `rbegin`, and other utilities to perform these operations, often requiring intermediate variables. Let's see how Ranges simplify this:

~~~cpp
int main() {
    const std::vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto even = [](int i) { return 0 == i % 2; };
    auto square = [](int i) { return i * i; };
    
    std::ranges::reverse_view rv{ 
        std::ranges::transform_view{
            std::ranges::filter_view{ numbers, even }, square
        }
    };
    
    for (const auto& i : rv)
        std::cout << i << ' ';                            
}
~~~

In this example, we use `filter_view` to select even numbers, then apply `transform_view` to square them, and finally pass the result to `reverse_view` to reverse the order. 

In terms of readability, some might find the first approach easier since the logical sequence matches the top-down reading order. The second approach requires reading from the inside out to align with the logic. However, the efficiency of the two differs significantly: the first requires intermediate variables like `temp` and `temp2`, while Ranges and Views avoid these entirely. Views are just references to the data, not copies.

To improve readability, C++20 introduced the pipeline operator `|`:

~~~cpp
int main() {
    const std::vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto even = [](int i) { return 0 == i % 2; };
    auto square = [](int i) { return i * i; };
    
    namespace sv = std::views;
    auto result = numbers | sv::filter(even) | sv::transform(square) | sv::reverse;
    
    for (const auto& i : result)
        std::cout << i << ' ';                                
}
~~~

With the pipeline operator `|`, `std::views::filter` can be combined seamlessly, enhancing readability and simplicity. Now we can read the sequence left-to-right: filter for even numbers, square them, then reverse the order. This eliminates intermediate variables and improves readability and code brevity.

### Lazy Evaluation

The above examples demonstrate the efficiency of Ranges. Views only reference source data, avoiding copies and reducing memory usage. Another powerful feature is lazy evaluation. Lazy evaluation means that View operations are only executed when needed, not immediately. These operations are queued in a pipeline and are executed only when the View is iterated over, allowing each element to pass through the pipeline to produce a final result.

### Standard Library Views

| Views               | Description |
|---------------------|-------------|
| `std::views::all`        | Returns a view of all elements starting from the first. |
| `std::views::drop`       | Drops a specified number of elements from the beginning and returns a view of the rest. |
| `std::views::drop_while` | Drops elements until the first that doesn’t match a specified predicate, then returns the remaining view. |
| `std::views::filter`     | Returns a view of all elements satisfying a specified predicate. |
| `std::views::join`       | Flattens a two-dimensional array into a one-dimensional view. |
| `std::views::join_with`  | Flattens a two-dimensional array with specified elements in between. |
| `std::views::reverse`    | Returns a view with elements in reverse order. |
| `std::views::split`      | Splits a view by a specified delimiter and returns the resulting sub-views. |
| `std::views::take`       | Returns a view of the first specified number of elements. |
| `std::views::take_while` | Returns a view of elements until the first that doesn’t match a specified predicate. |
| `std::views::transform`  | Returns a view with each element transformed by a specified function. |
| `std::views::keys`       | Generates a view of the first elements in a pair-like structure. |
| `std::views::values`     | Generates a view of the second elements in a pair-like structure. |
| `std::views::elements`   | Generates a view of the Nth element in each tuple of a tuple-like structure. |
| `std::views::zip`        | Combines multiple sub-arrays into a two-dimensional view. |
| `std::views::zip_transform` | Combines multiple sub-arrays using a specified operation (e.g., add). |
| `std::views::adjacent`   | Returns a view of all contiguous N-element combinations. |
| `std::views::adjacent_transform` | Extends `adjacent` to allow specified operations on contiguous N elements. |
| `std::views::stride`     | Returns a view that takes every nth element. |
| `std::views::chunk`      | Splits a view into chunks of a specified size. |
| `std::views::counted`    | Returns a view starting at a specific position and taking a specified number of elements. |
| `std::views::common`     | Converts a non-common range into a common range. |
| `std::views::as_const`   | Returns a const view of the elements. |
| `std::views::as_rvalue`  | Returns an rvalue view of the elements. |

### References

- [Ranges Composition in C++](https://www.cppstories.com/2022/ranges-composition/)
- [Introduction to C++ Ranges](https://hannes.hauswedell.net/post/2019/11/30/range_intro/)
- [A Complete Guide to C++20 Ranges](https://itnext.io/c-20-ranges-complete-guide-4d26e3511db0)
- *A Beginner's Guide to C++ Ranges and Views* by Hannes Hauswedell
